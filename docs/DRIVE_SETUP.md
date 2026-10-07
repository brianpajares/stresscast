# DRIVE_SETUP · StressCast

## Objetivo

La app lee artefactos versionados desde la carpeta de Google Drive correspondiente a `/Apps/stresscast/`, valida checksum SHA-256, cachea 24 horas y usa la última versión válida si Drive falla.

## 1. Crear la service account

1. En Google Cloud, crea o selecciona un proyecto dedicado o controlado por la organización.
2. Habilita Google Drive API.
3. Crea una service account para StressCast.
4. Genera la credencial privada solo si tu plataforma de despliegue la requiere; guarda el secreto fuera del repositorio.
5. Configura `GOOGLE_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` en Vercel/Netlify.

La clave privada suele contener saltos de línea. El código debe normalizar `\n` cuando el proveedor de env los serializa.

## 2. Crear y compartir la carpeta

1. Crea `/Apps/stresscast/` en Drive.
2. Dentro, conserva la estructura `base/`, `docs/`, `model/`, `templates/`.
3. Comparte la carpeta raíz con el email de la service account con el mínimo permiso necesario.
4. Copia el ID de la carpeta a `GOOGLE_DRIVE_FOLDER_ID`.

Drive no expone rutas POSIX reales. La app debe resolver cada `drive_path` del manifiesto caminando por folder IDs/nombres desde `GOOGLE_DRIVE_FOLDER_ID`.

## 3. Archivos

El contenido local a sincronizar está en `drive/`. El manifiesto canónico está en `spec/drive_manifest.json`.

Antes de subir:
- recalcular checksum solo si el contenido cambió intencionalmente;
- actualizar versión/manifest;
- ejecutar los tests del motor si cambia un artefacto que afecta cálculo.

## 4. `npm run drive:sync`

Implementa un script TypeScript (por ejemplo `scripts/drive-sync.ts`) que:
- autentique con la service account;
- cree carpetas faltantes;
- suba/actualice archivos de `drive/`;
- preserve jerarquía;
- verifique checksum post-upload cuando sea viable;
- no borre archivos remotos fuera del manifiesto sin una bandera explícita de mantenimiento;
- salga con código !=0 ante mismatch.

Comando esperado:
`npm run drive:sync`

## 5. Loader de producción

Algoritmo:
1. cargar el manifiesto bundled/canónico;
2. resolver el archivo remoto por ruta/nombre;
3. descargar bytes;
4. calcular SHA-256;
5. aceptar solo si coincide;
6. guardar cache con `fetched_at`, hash y version;
7. usar cache mientras tenga menos de `GOOGLE_DRIVE_CACHE_TTL_HOURS` horas;
8. si Drive falla tras expirar TTL, usar la última versión válida persistida/cacheada y emitir alerta;
9. si checksum no coincide, rechazar la nueva versión y conservar la última válida.

## 6. Seguridad

- La service account solo accede a la carpeta del producto.
- Nunca enviar credenciales Drive al cliente.
- No loguear private key, access token ni bytes sensibles.
- Rotar credencial ante sospecha de exposición.
- Probar el fallback antes de launch.

## 7. Smoke test

- `npm run drive:sync`
- comparar 8/8 hashes con `spec/drive_manifest.json`
- cambiar un archivo remoto en entorno de prueba: loader debe rechazarlo
- simular error Drive: loader debe servir última versión válida
