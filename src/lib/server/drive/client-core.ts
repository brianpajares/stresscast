import { JWT } from "google-auth-library";

/**
 * Cliente mínimo de Google Drive v3 con service account (REST + fetch; sin la dependencia gigante `googleapis`).
 * Drive no tiene rutas POSIX: se resuelve cada segmento caminando por IDs desde GOOGLE_DRIVE_FOLDER_ID.
 * Nunca se loguean tokens ni la clave privada.
 */
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  size?: string;
  modifiedTime?: string;
}

export interface DriveConfig {
  email: string;
  privateKey: string;
  rootFolderId: string;
}

export class DriveClient {
  private readonly auth: JWT;

  constructor(
    private readonly config: DriveConfig,
    options: { write?: boolean } = {},
  ) {
    this.auth = new JWT({
      email: config.email,
      key: config.privateKey,
      scopes: [options.write ? "https://www.googleapis.com/auth/drive" : "https://www.googleapis.com/auth/drive.readonly"],
    });
  }

  get rootFolderId(): string {
    return this.config.rootFolderId;
  }

  private async headers(): Promise<Record<string, string>> {
    const { token } = await this.auth.getAccessToken();
    if (!token) throw new Error("drive_auth_failed");
    return { Authorization: `Bearer ${token}` };
  }

  private async request(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: { ...(await this.headers()), ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`drive_http_${res.status}`);
    return res;
  }

  async findChild(parentId: string, name: string, folder = false): Promise<DriveFile | null> {
    const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const q = [`'${parentId}' in parents`, `name = '${escaped}'`, "trashed = false"];
    if (folder) q.push(`mimeType = '${FOLDER_MIME}'`);
    const params = new URLSearchParams({
      q: q.join(" and "),
      fields: "files(id,name,mimeType,md5Checksum,size,modifiedTime)",
      pageSize: "10",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    const res = await this.request(`${API}/files?${params}`);
    const data = (await res.json()) as { files?: DriveFile[] };
    return data.files?.[0] ?? null;
  }

  /** Resuelve una ruta relativa a la raíz (`base/base_stresscast.xlsx`) y devuelve el archivo. */
  async resolveFile(relativePath: string): Promise<DriveFile | null> {
    const parts = relativePath.split("/").filter(Boolean);
    let parent = this.config.rootFolderId;
    for (const [i, part] of parts.entries()) {
      const isLast = i === parts.length - 1;
      const found = await this.findChild(parent, part, !isLast);
      if (!found) return null;
      if (isLast) return found;
      parent = found.id;
    }
    return null;
  }

  async download(fileId: string): Promise<Uint8Array> {
    const params = new URLSearchParams({ alt: "media", supportsAllDrives: "true" });
    const res = await this.request(`${API}/files/${fileId}?${params}`, {}, 15000);
    return new Uint8Array(await res.arrayBuffer());
  }

  async ensureFolder(parentId: string, name: string): Promise<DriveFile> {
    const existing = await this.findChild(parentId, name, true);
    if (existing) return existing;
    const res = await this.request(`${API}/files?supportsAllDrives=true&fields=id,name,mimeType`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
    });
    return (await res.json()) as DriveFile;
  }

  /** Crea o actualiza (por nombre) un archivo dentro de `parentId`. */
  async upsertFile(parentId: string, name: string, bytes: Uint8Array, mimeType: string): Promise<DriveFile> {
    const existing = await this.findChild(parentId, name, false);
    const boundary = `sc${crypto.randomUUID().replace(/-/g, "")}`;
    const metadata = existing ? { name } : { name, parents: [parentId] };
    const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const tail = `\r\n--${boundary}--`;
    const body = Buffer.concat([Buffer.from(head, "utf8"), Buffer.from(bytes), Buffer.from(tail, "utf8")]);
    const url = existing
      ? `${UPLOAD}/files/${existing.id}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,md5Checksum,size`
      : `${UPLOAD}/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,md5Checksum,size`;
    const res = await this.request(
      url,
      { method: existing ? "PATCH" : "POST", headers: { "content-type": `multipart/related; boundary=${boundary}` }, body },
      30000,
    );
    return (await res.json()) as DriveFile;
  }
}
