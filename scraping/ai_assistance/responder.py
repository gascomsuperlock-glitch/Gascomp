"""Validate and orchestrate natural, knowledge-grounded support responses."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Callable

from scraping.ai_assistance.grounding import build_evidence, sanitize_history, unsafe_service_advice
from scraping.ai_assistance.knowledge import resolve_product_context


_KINDS = frozenset({"answer", "clarification", "handoff"})
_BASES = frozenset({"knowledge", "general"})
_LINK_OR_MARKUP = re.compile(
    r"\b[a-z][a-z0-9+.-]*://|\b(?:www\.|wa\.me\b)|"
    r"\b[a-z0-9][a-z0-9.-]*\.(?:com|co\.id|id|net|org|app|io)(?:/\S*)?|"
    r"\[\[|<\s*/?\s*[a-z][^>]*>|\]\s*\(",
    re.I,
)
_FALSE_ACTION = re.compile(
    r"\b(?:sudah|telah|have|has)\s+(?:saya\s+)?(?:hubungi|menghubungi|laporkan|"
    r"melaporkan|beri\s+tahu|notified?|contacted?|reported?)\b|"
    r"\badmin\s+(?:sudah|telah|has\s+been)\s+(?:dihubungi|notified|contacted)\b",
    re.I,
)
_STRUCTURED_PAYLOAD = re.compile(
    r"```|[\[{]\s*[\"']|\"[A-Za-z_][A-Za-z0-9_]*\"\s*:|\\[\"nrt]|"
    r"\b(?:sourceids|basis|kind)\s*:\s*[\"'\[{]",
    re.I,
)


def _looks_structured(text: str) -> bool:
    """Detect a serialized payload without rejecting marketplace titles.

    A listing name such as `{COD} PAKET ...` or `[TAMBAHAN] ...` opens with a
    bracket but is ordinary prose, so a whole-text match must actually parse.
    """
    if _STRUCTURED_PAYLOAD.search(text):
        return True
    stripped = text.strip()
    if stripped[:1] not in "[{" or stripped[-1:] not in "]}":
        return False
    try:
        json.loads(stripped)
    except ValueError:
        return False
    return True
_PROMPT_LEAK = re.compile(r"\b(?:system prompt|developer message|api[_ -]?key|worker token|lease token)\b", re.I)
_ADMIN_REQUEST = re.compile(
    r"\b(?:hubungi|kontak|bicara|ngobrol|sambung(?:kan)?|connect|contact|talk|speak)\b.{0,30}"
    r"\b(?:admin|cs|customer service|manusia|human|whatsapp|wa)\b|"
    r"\b(?:admin|cs|customer service|manusia|human|whatsapp|wa)\b.{0,30}"
    r"\b(?:hubungi|kontak|bicara|ngobrol|sambung(?:kan)?|connect|contact|talk|speak)\b",
    re.I,
)
_HAZARD = re.compile(
    r"\b(?:ada\s+bau\s+gas|tercium\s+(?:bau\s+)?gas|mencium\s+bau\s+gas|bau\s+gas|"
    r"gas\s+(?:bocor|merembes)|kebocoran\s+gas|(?:gas|tabung|regulator)\b.{0,30}\bmendesis|"
    r"mendesis\b.{0,30}\b(?:gas|tabung|regulator)|(?:terjadi|ada)\s+kebakaran|"
    r"kebakaran\s+terjadi|api\s+menyambar|terbakar)\b",
    re.I,
)
_NEGATED_HAZARD = re.compile(
    r"\b(?:tidak|tak|nggak|gak|ga|tanpa|bukan)\s+(?:ada\s+)?(?:tercium\s+)?(?:bau\s+)?gas\b|"
    r"\b(?:tidak|tak|nggak|gak|ga)\s+(?:ada\s+)?(?:suara\s+)?mendesis\b"
    r"|\b(?:no|not|do\s+not|don't|cannot|can't)\s+(?:smell\s+)?(?:a\s+)?gas\b|"
    r"\bno\s+gas\s+smell\b|\b(?:not|isn't|isnt)\s+hissing\b",
    re.I,
)
_ENGLISH_HAZARD = re.compile(
    r"\b(?:smell(?:ing)?\s+(?:a\s+)?gas|gas\s+smell|gas\s+(?:leak|leaking)|"
    r"(?:gas|cylinder|regulator)\b.{0,30}\bhissing|hissing\b.{0,30}\b(?:gas|cylinder|regulator)|"
    r"(?:there\s+is|there's|see|seeing)\s+(?:a\s+)?(?:fire|flames?)|caught\s+fire|is\s+burning)\b",
    re.I,
)
_MODEL_CODE = re.compile(r"(?<![\w-])[a-z]{2,}[a-z0-9]*-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])", re.I)
_UNSUPPORTED_SAFETY_ASSURANCE = re.compile(
    r"(?<!belum )(?<!tidak )\b(?:kemungkinan|berarti|jadi|pastinya|pasti)\b[^.!?]{0,70}\b"
    r"(?:bukan\s+(?:masalah\s+)?kebocoran|tidak\s+(?:ada\s+kebocoran|bocor)|aman)\b|"
    r"\b(?:probably|likely|therefore|definitely|completely)\b[^.!?]{0,50}\b"
    r"(?:not\s+(?:a\s+)?leak(?:ing)?|no\s+(?:gas\s+)?leak|safe)\b",
    re.I,
)
_ASSERTED_DIAGNOSIS = re.compile(
    r"\b(?:penyebabnya|masalahnya)\s+(?:adalah|karena)\b|\bthe\s+cause\s+is\b|\bcaused\s+by\b|"
    r"\b(?:valve|katup|regulator|unit|produk|product|it)\s+(?:is|sudah|pasti)\s+"
    r"(?:rusak|patah|macet|tersumbat|bocor|broken|faulty|clogged|stuck|damaged)\b|"
    r"(?<!tidak\s)(?<!bukan\s)\bberarti\s+(?:rusak|patah|macet|tersumbat|bocor)\b"
    r"|\bkemungkinan\s+(?:penyebab|masalah)(?:nya)?\s+(?:adalah|ada|karena|pada)\b|"
    r"\b(?:may|might|could)\s+be\s+(?:caused\s+by|due\s+to)\b",
    re.I,
)
_UNHELPFUL_REFUSAL = re.compile(
    r"\b(?:tidak|belum)\s+(?:dapat|bisa)\s+memberikan\s+jawaban\s+spesifik\b|"
    r"\b(?:tidak|belum)\s+memiliki\s+akses\b|\bI\s+(?:do\s+not|don't)\s+have\s+access\b|"
    r"\b(?:knowledge\s+base|database|provided\s+evidence|bukti\s+yang\s+diberikan)\b|"
    r"\b(?:tidak|nggak|gak)\s+bisa\s+mendiagno(?:sa|sis)\b|\bI\s+cannot\s+diagnose\b",
    re.I,
)
_CONDITIONAL_HAZARD_LECTURE = re.compile(
    r"\b(?:jika|kalau|apabila)\b.{0,80}\b(?:bau\s+gas|kebocoran\s+gas)\b|"
    r"\bif\b.{0,80}\b(?:smell\s+gas|gas\s+leak)\b",
    re.I | re.S,
)
_SYMPTOM = re.compile(
    r"\b(?:tidak|tak|nggak|gak|ga|belum)\s+(?:bisa\s+)?(?:nyala|menyala|berfungsi|jalan)|"
    r"\b(?:mati|error|bermasalah|kendala|not\s+(?:working|turning\s+on)|won't\s+(?:work|turn\s+on))\b",
    re.I,
)


@dataclass(frozen=True)
class GroundedResult:
    response: dict
    resolved_sku: str | None = None


def _template(snapshot: dict, language: str, kind: str) -> tuple[str, str] | None:
    for entry in snapshot.get("entries", []):
        if entry.get("language") == language and entry.get("kind") == kind:
            return entry["answer"].strip(), entry["id"]
    return None


def safe_fallback(language: str, sku: str | None = None, *, handoff: bool = False) -> dict:
    if handoff:
        text = ("Saya belum dapat memproses permintaan ini dengan aman. Silakan lanjutkan ke admin melalui pilihan WhatsApp."
                if language == "id" else
                "I cannot process this request safely right now. Please continue with an admin using the WhatsApp option.")
        return {"text": text, "kind": "handoff", "basis": "general", "sourceIds": []}
    if language == "id":
        text = ((f"Saya belum cukup yakin informasi mana yang tepat untuk {sku}. "
                 "Bisa sebutkan varian atau toko produknya agar informasinya tidak tertukar?") if sku else
                "Saya belum cukup yakin informasi mana yang tepat. Bisa sebutkan nama atau kode produk dan hal yang ingin dibantu?")
    else:
        text = ((f"I am not sure which information applies to {sku} yet. Which variant or store is the product from?")
                if sku else
                "I am not sure which information applies yet. What is the product name or code, and what would you like help with?")
    return {"text": text, "kind": "clarification", "basis": "general", "sourceIds": []}


def _hazard_response(language: str) -> dict:
    if language == "id":
        text = ("Ini bisa menjadi kondisi kebocoran gas. Jika aman dijangkau, matikan aliran gas. "
                "Jangan menyalakan api atau sakelar listrik, buka ventilasi, dan menjauh dari area tersebut. "
                "Gunakan pilihan WhatsApp untuk menghubungi admin dan cari bantuan teknisi atau layanan darurat setempat.")
    else:
        text = ("This may be a gas leak. If it is safe to reach, shut off the gas supply. Do not use flames or "
                "electrical switches, ventilate the area, and move away. Use the WhatsApp option to contact an "
                "admin and seek qualified or local emergency help.")
    return {"text": text, "kind": "handoff", "basis": "general", "sourceIds": []}


def _positive_hazard(text: str) -> bool:
    clauses = re.split(r"[,.;!?]|\b(?:tapi|tetapi|namun|but|however|dan|and)\b", text, flags=re.I)
    return any((_HAZARD.search(clause) or _ENGLISH_HAZARD.search(clause))
               and not _NEGATED_HAZARD.search(clause) for clause in clauses)


def _history_sku(snapshot: dict, history: list[dict[str, str]], current: str) -> str | None:
    # A model-like code in the current message is an explicit context attempt;
    # never let older context silently override an unknown or different code.
    if _MODEL_CODE.search(current):
        return resolve_product_context(snapshot, current, None)
    for item in reversed(history):
        if item["role"] == "user":
            resolved = resolve_product_context(snapshot, item["text"], None)
            if resolved:
                return resolved
            if _MODEL_CODE.search(item["text"]):
                return None
    return resolve_product_context(snapshot, current, None)


def _conversation_fallback(language: str, text: str, history: list[dict[str, str]],
                           sku: str | None, symptom_context: bool) -> dict:
    combined = "\n".join([*(item["text"] for item in history if item["role"] == "user"), text])
    no_gas = bool(_NEGATED_HAZARD.search(combined))
    new_install = bool(re.search(r"\b(?:baru\b.{0,40}\b(?:pasang|dipasang)|pertama\s+kali\b.{0,40}\b(?:pasang|dipasang)|pemasangan\s+baru|new(?:ly)?\s+installed?)\b",
                                 combined, re.I))
    gas_context = bool((sku and sku.upper().startswith("GRS")) or
                       re.search(r"\b(?:gas|regulator|kompor|tabung|stove|cylinder)\b", text, re.I))
    if symptom_context:
        if sku and not gas_context:
            answer = (f"Saya paham ada kendala pada {sku}. Apa yang terlihat atau terdengar saat produk dicoba?"
                      if language == "id" else
                      f"I understand there is a problem with the {sku}. What do you see or hear when you try it?")
            return {"text": answer, "kind": "clarification", "basis": "general", "sourceIds": []}
        if language == "id":
            if not sku:
                answer = "Saya paham produknya sedang tidak berfungsi. Apa nama atau kode model produknya?"
            elif no_gas and new_install:
                answer = (f"Baik, berarti {sku} tidak menunjukkan bau gas dan kendalanya muncul pada pemasangan baru. "
                          "Saat dicoba, apa yang terlihat atau terdengar—ada respons sesaat atau sama sekali tidak bereaksi?")
            elif no_gas:
                answer = (f"Baik, berarti tidak ada bau gas yang tercium saat {sku} dicoba. "
                          "Apakah kendala ini muncul sejak pemasangan pertama atau baru terjadi setelah sebelumnya berfungsi?")
            else:
                answer = (f"Saya paham {sku} Anda tidak menyala. "
                          "Apakah tercium bau gas atau terdengar desisan saat Anda mencobanya?")
        else:
            if not sku:
                answer = "I understand that the product is not working. What is its product name or model code?"
            elif no_gas and new_install:
                answer = (f"Thanks, there is no gas smell and the {sku} issue began with a new installation. "
                          "When you try it, is there any brief response or does it remain completely inactive?")
            elif no_gas:
                answer = (f"Thanks, there is no gas smell when you try the {sku}. "
                          "Did this begin with the first installation or only after it had worked before?")
            else:
                answer = (f"I understand that your {sku} is not turning on. "
                          "Can you smell gas or hear hissing when you try it?")
        return {"text": answer, "kind": "clarification", "basis": "general", "sourceIds": []}
    if _MODEL_CODE.search(text) and not sku:
        answer = ("Saya belum mengenali kode produk tersebut. Bisa periksa kembali kodenya atau sebutkan nama produknya?"
                  if language == "id" else
                  "I do not recognize that product code yet. Could you check the code or tell me the product name?")
        return {"text": answer, "kind": "clarification", "basis": "general", "sourceIds": []}
    return safe_fallback(language, sku)


def validate_grounded_response(raw: str, evidence: list[dict]) -> tuple[dict | None, str | None]:
    """Return a strict response and a content-free rejection reason."""
    try:
        value = json.loads(raw)
    except (TypeError, ValueError):
        return None, "invalid_json"
    if not isinstance(value, dict) or set(value) != {"text", "kind", "basis", "sourceIds"}:
        return None, "invalid_schema"
    text, kind, basis, source_ids = value["text"], value["kind"], value["basis"], value["sourceIds"]
    if (not isinstance(text, str) or not text.strip() or len(text) > 3000
            or kind not in _KINDS or basis not in _BASES or not isinstance(source_ids, list)
            or len(source_ids) > 5 or any(not isinstance(item, str) for item in source_ids)
            or len(source_ids) != len(set(source_ids))):
        return None, "invalid_fields"
    allowed = {item["id"] for item in evidence}
    if any(identifier not in allowed for identifier in source_ids):
        return None, "invalid_source"
    if (basis == "knowledge") != bool(source_ids):
        return None, "invalid_basis"
    clean = text.strip()
    if _LINK_OR_MARKUP.search(clean):
        return None, "unsafe_markup"
    # The customer reads this text directly. A model that nests its JSON, fences a
    # code block, or echoes the response schema must fall back to safe wording.
    if _looks_structured(clean):
        return None, "structured_payload"
    if _FALSE_ACTION.search(clean):
        return None, "false_action"
    if _PROMPT_LEAK.search(clean):
        return None, "prompt_leak"
    if unsafe_service_advice(clean):
        return None, "unsafe_advice"
    if _UNSUPPORTED_SAFETY_ASSURANCE.search(clean):
        return None, "unsupported_safety_assurance"
    return {"text": clean, "kind": kind, "basis": basis, "sourceIds": source_ids}, None


def parse_grounded_response(raw: str, evidence: list[dict]) -> dict | None:
    """Accept only the strict public response schema and cited supplied IDs."""
    return validate_grounded_response(raw, evidence)[0]


class GroundedResponder:
    """Supply safe evidence to a generator and validate its complete response."""

    def __init__(self, generator: Callable[[dict, float], str],
                 rejection_observer: Callable[[str], None] | None = None):
        self.generator = generator
        self.rejection_observer = rejection_observer

    def __call__(self, job: dict, snapshot: dict, source_index, timeout: float) -> GroundedResult:
        language = job.get("language") if job.get("language") in ("id", "en") else "id"
        text = job.get("text") if isinstance(job.get("text"), str) else ""
        if _positive_hazard(text):
            return GroundedResult(_hazard_response(language))
        if _ADMIN_REQUEST.search(text):
            answer = ("Bisa, Kak. Silakan gunakan tautan WhatsApp di bawah untuk berbicara dengan admin."
                      if language == "id" else
                      "Of course. Please use the WhatsApp link below to speak with an admin.")
            return GroundedResult({"text": answer, "kind": "handoff", "basis": "general", "sourceIds": []})

        history = sanitize_history(job.get("history"))
        prior_sku = None if job.get("sku") else _history_sku(snapshot, history, text)
        evidence, resolved_sku = build_evidence(
            snapshot, source_index, text, language, job.get("sku") or prior_sku,
            context_ambiguous=job.get("contextAmbiguous") is True,
        )
        if job.get("contextAmbiguous") is True:
            return GroundedResult(safe_fallback(language), None)
        payload = {
            "language": language,
            "customer": text[:2000],
            "history": history,
            "resolvedSku": resolved_sku,
            "evidence": evidence,
        }
        try:
            response, rejection = validate_grounded_response(self.generator(payload, timeout), evidence)
        except (OSError, ValueError, TypeError):
            response, rejection = None, "generator_error"
        if response and response["text"].strip().casefold() == text.strip().casefold():
            greeting = _template(snapshot, language, "greeting")
            if (greeting and not resolved_sku and len(text) <= 80
                    and re.match(r"^(?:halo|hallo|hai|hi|hello|hey)\b", text.strip(), re.I)):
                answer, identifier = greeting
                return GroundedResult({"text": answer, "kind": "answer", "basis": "knowledge",
                                       "sourceIds": [identifier]})
            response, rejection = None, "echoed_request"
        prior_symptom = any(_SYMPTOM.search(item["text"]) for item in history if item["role"] == "user")
        followup_detail = bool(_NEGATED_HAZARD.search(text) or re.search(
            r"\b(?:baru\s+(?:pasang|dipasang)|pemasangan\s+baru|new(?:ly)?\s+installed?)\b", text, re.I,
        ))
        symptom_context = bool(_SYMPTOM.search(text) or (prior_symptom and followup_detail))
        if (response and symptom_context and response["kind"] != "handoff"
                and "?" not in response["text"] and _UNHELPFUL_REFUSAL.search(response["text"])):
            response, rejection = None, "unhelpful_response"
        if response and response["kind"] != "handoff" and response["basis"] == "general":
            # An unknown model code needs clarification. Known product context
            # may still receive ordinary explanations, but not an uncited fault
            # diagnosis such as asserting that a valve is broken.
            if (response["kind"] == "answer" and not resolved_sku and _MODEL_CODE.search(text)) or (
                    resolved_sku and _ASSERTED_DIAGNOSIS.search(response["text"])):
                response, rejection = None, "unsupported_product_claim"
        if rejection and self.rejection_observer:
            self.rejection_observer(rejection)
        if response:
            return GroundedResult(response, resolved_sku)
        return GroundedResult(_conversation_fallback(language, text, history, resolved_sku, symptom_context),
                              resolved_sku)
