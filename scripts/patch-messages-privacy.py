#!/usr/bin/env python3
"""Añade a src/messages/*.json las claves del flujo de derechos del titular (confirmación y emails)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ADD = {
    "en": {
        "rights": {
            "confirmTitle": "Confirm your request",
            "confirmBody": "To protect your data, confirm that you want us to proceed with your {type} request.",
            "confirmButton": "Confirm request",
            "confirmDone": "Done. Your request was processed. If you asked for a copy of your data, it is on its way to your email.",
            "confirmInvalid": "This confirmation link is invalid or has already been used.",
            "confirmError": "We could not process your request. Please try again.",
            "typeLabel": {"access": "access", "deletion": "deletion", "rectification": "correction"},
        },
        "privacyEmail": {
            "verifySubject": "Confirm your StressCast data request",
            "verifyBody": "We received a request for {type} of your StressCast data. If it was you, confirm it with the button below. If not, ignore this email: nothing will change.",
            "verifyButton": "Confirm request",
            "exportSubject": "Your StressCast data copy",
            "exportBody": "Attached is a copy of the data we hold for this email address (JSON).",
            "deletedSubject": "Your StressCast data was deleted",
            "deletedBody": "We deleted or anonymized the data associated with this email, except records we are legally required to keep.",
            "rectificationSubject": "We received your correction request",
            "rectificationBody": "We received your correction request and will follow up by email. Answers are a point-in-time measurement and cannot be edited in place; you can take the check again at any time.",
        },
    },
    "es": {
        "rights": {
            "confirmTitle": "Confirma tu solicitud",
            "confirmBody": "Para proteger tus datos, confirma que quieres que continuemos con tu solicitud de {type}.",
            "confirmButton": "Confirmar solicitud",
            "confirmDone": "Listo. Tu solicitud fue procesada. Si pediste una copia de tus datos, va en camino a tu email.",
            "confirmInvalid": "Este enlace de confirmación no es válido o ya se usó.",
            "confirmError": "No pudimos procesar tu solicitud. Inténtalo de nuevo.",
            "typeLabel": {"access": "acceso", "deletion": "eliminación", "rectification": "corrección"},
        },
        "privacyEmail": {
            "verifySubject": "Confirma tu solicitud de datos de StressCast",
            "verifyBody": "Recibimos una solicitud de {type} de tus datos de StressCast. Si fuiste tú, confírmala con el botón de abajo. Si no, ignora este email: no cambiará nada.",
            "verifyButton": "Confirmar solicitud",
            "exportSubject": "Tu copia de datos de StressCast",
            "exportBody": "Adjuntamos una copia de los datos que conservamos para este email (JSON).",
            "deletedSubject": "Tus datos de StressCast fueron eliminados",
            "deletedBody": "Eliminamos o anonimizamos los datos asociados a este email, salvo los registros que la ley nos obliga a conservar.",
            "rectificationSubject": "Recibimos tu solicitud de corrección",
            "rectificationBody": "Recibimos tu solicitud de corrección y te responderemos por email. Las respuestas son una medición en un momento dado y no se editan; puedes repetir el chequeo cuando quieras.",
        },
    },
    "pt": {
        "rights": {
            "confirmTitle": "Confirme sua solicitação",
            "confirmBody": "Para proteger seus dados, confirme que deseja que prossigamos com sua solicitação de {type}.",
            "confirmButton": "Confirmar solicitação",
            "confirmDone": "Pronto. Sua solicitação foi processada. Se você pediu uma cópia dos seus dados, ela está a caminho do seu email.",
            "confirmInvalid": "Este link de confirmação é inválido ou já foi usado.",
            "confirmError": "Não conseguimos processar sua solicitação. Tente novamente.",
            "typeLabel": {"access": "acesso", "deletion": "exclusão", "rectification": "correção"},
        },
        "privacyEmail": {
            "verifySubject": "Confirme sua solicitação de dados do StressCast",
            "verifyBody": "Recebemos uma solicitação de {type} dos seus dados do StressCast. Se foi você, confirme com o botão abaixo. Se não, ignore este email: nada será alterado.",
            "verifyButton": "Confirmar solicitação",
            "exportSubject": "Sua cópia de dados do StressCast",
            "exportBody": "Segue em anexo uma cópia dos dados que mantemos para este email (JSON).",
            "deletedSubject": "Seus dados do StressCast foram excluídos",
            "deletedBody": "Excluímos ou anonimizamos os dados associados a este email, exceto os registros que somos obrigados por lei a manter.",
            "rectificationSubject": "Recebemos sua solicitação de correção",
            "rectificationBody": "Recebemos sua solicitação de correção e responderemos por email. As respostas são uma medição em um momento e não são editadas; você pode refazer o check quando quiser.",
        },
    },
}

for loc, add in ADD.items():
    p = ROOT / "src" / "messages" / f"{loc}.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    data["legal"]["rights"].update(add["rights"])
    data["privacyEmail"] = add["privacyEmail"]
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("patched", loc)
