"""Validate and retrieve owner-authored answer text without rewriting it."""

from __future__ import annotations

import hashlib
import ipaddress
import json
import math
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit


class KnowledgeError(ValueError):
    """Knowledge cannot safely be made active."""


def public_https_url(value: str, hosts: set[str] | None = None) -> bool:
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").lower()
        if (parsed.scheme != "https" or not host or parsed.username or parsed.password
                or parsed.port not in (None, 443)):
            return False
        if host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
            return False
        try:
            if not ipaddress.ip_address(host).is_global:
                return False
        except ValueError:
            if "." not in host:
                return False
        return hosts is None or host in hosts
    except ValueError:
        return False


def answer_links(answer: str) -> list[str]:
    return re.findall(r"https?://[^\s<>\]\)\"']+", answer)


def validate_entry(entry: dict) -> dict:
    if not isinstance(entry, dict) or set(entry) - {"id", "kind", "language", "questions", "sku", "answer"}:
        raise KnowledgeError("Unknown entry fields")
    if not isinstance(entry.get("id"), str) or not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,79}", entry["id"]):
        raise KnowledgeError("Invalid entry ID")
    if entry.get("kind") not in ("answer", "greeting", "clarification", "handoff"):
        raise KnowledgeError("Invalid entry kind")
    if entry.get("language") not in ("en", "id"):
        raise KnowledgeError("Invalid entry language")
    questions = entry.get("questions")
    if (not isinstance(questions, list) or not questions or len(questions) > 50
            or any(not isinstance(q, str) or not q.strip() or len(q) > 500 for q in questions)):
        raise KnowledgeError("Questions must contain nonempty text")
    answer = entry.get("answer")
    if not isinstance(answer, str) or not answer.strip() or len(answer) > 12000:
        raise KnowledgeError("Answer must contain final approved text")
    if any(not public_https_url(url) for url in answer_links(answer)):
        raise KnowledgeError("Answer links must use public HTTPS")
    if "[[" in answer or re.search(r"(?:localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|\.local\b)", answer, re.I):
        raise KnowledgeError("Local answer destinations are forbidden")
    if re.search(r"\b(?!https:)[a-z][a-z0-9+.-]*://", answer, re.I) or re.search(r"\]\(\s*(?:javascript|data|file):", answer, re.I):
        raise KnowledgeError("Answer destinations must use HTTPS")
    result = dict(entry)
    if "sku" in result:
        if not isinstance(result["sku"], str) or len(result["sku"]) > 100:
            raise KnowledgeError("Invalid SKU")
        if not result["sku"].strip():
            del result["sku"]
        elif result["kind"] != "answer":
            raise KnowledgeError("Templates cannot have a SKU")
    return result


def parse_note(text: str) -> dict:
    # read_text normalizes CRLF. Only the frontmatter delimiters are removed.
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        raise KnowledgeError("Use JSON frontmatter enclosed by --- lines")
    metadata, answer = text[4:].split("\n---\n", 1)
    try:
        fields = json.loads(metadata)
    except (ValueError, TypeError) as error:
        raise KnowledgeError("Frontmatter must be valid JSON") from error
    if not isinstance(fields, dict) or "answer" in fields:
        raise KnowledgeError("The answer belongs in the Markdown body")
    return validate_entry({**fields, "answer": answer})


def note_files(vault: Path) -> list[Path]:
    if not vault.is_dir() or vault.is_symlink():
        raise KnowledgeError("Knowledge directory is unavailable")
    files = sorted(path for path in vault.rglob("*.md")
                   if path.name.lower() != "readme.md" and not any(part.startswith(".") for part in path.relative_to(vault).parts))
    if len(files) > 2000:
        raise KnowledgeError("Knowledge exceeds the 2000-entry limit")
    for path in files:
        if path.is_symlink() or not path.resolve().is_relative_to(vault.resolve()):
            raise KnowledgeError("Knowledge symlinks are forbidden")
    return files


def vault_signature(vault: Path) -> str:
    digest = hashlib.sha256()
    for path in note_files(vault):
        if path.stat().st_size > 64000:
            raise KnowledgeError("Knowledge note exceeds size limit")
        digest.update(str(path.relative_to(vault)).encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
    return digest.hexdigest()


def build_snapshot(vault: Path) -> dict:
    initial = vault_signature(vault)
    entries = [parse_note(path.read_text(encoding="utf-8")) for path in note_files(vault)]
    ids = [entry["id"] for entry in entries]
    if len(ids) != len(set(ids)):
        raise KnowledgeError("Duplicate entry ID")
    for language in ("en", "id"):
        for kind in ("greeting", "clarification", "handoff"):
            if sum(entry["language"] == language and entry["kind"] == kind for entry in entries) != 1:
                raise KnowledgeError("Each language requires exactly one greeting, clarification, and handoff")
    if initial != vault_signature(vault):
        raise KnowledgeError("Knowledge changed during validation")
    entries.sort(key=lambda entry: entry["id"])
    canonical = json.dumps(entries, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    snapshot = {"version": hashlib.sha256(canonical.encode("utf-8")).hexdigest(), "entries": entries}
    # Match transport.json_request's serialization and the API request body limit.
    publication = json.dumps({"ready": True, "snapshot": snapshot}, ensure_ascii=False).encode("utf-8")
    if len(publication) > 4 * 1024 * 1024:
        raise KnowledgeError("Knowledge publication exceeds the 4 MiB limit")
    return snapshot


def tokens(text: str) -> set[str]:
    return set(re.findall(r"[\w-]+", text.lower()))


_POLITE_FILLERS = frozenset({"admin", "dong", "kak", "kakak", "min", "please"})
_NON_SKU_PREFIXES = frozenset({"cm", "gr", "kg", "ke", "ml", "mm", "no", "rp"})
_SEARCH_STOPWORDS = frozenset({
    "a", "ada", "adalah", "about", "atau", "apa", "apakah", "bagaimana", "berapa",
    "bisa", "boleh", "buat", "can", "cara", "dan", "dari", "di", "do", "does",
    "for", "gascomp", "gimana", "how", "i", "ini", "is", "it", "itu", "ke", "kok",
    "mau", "me", "mengenai", "my", "of", "on", "please", "produk", "product", "saya",
    "sebuah", "soal", "the", "this", "to", "untuk", "what", "with", "yang",
})
# Marketplace titles are keyword stuffed ("Anti Bocor", "Tidak Mudah Rusak"), so a
# symptom or condition word can appear in exactly one listing and would then name a
# product the customer never mentioned. These describe intent, never identity.
_SYMPTOM_OR_CONDITION = frozenset({
    "aman", "anti", "bahaya", "berbahaya", "berisik", "bermasalah", "bocor", "bunyi",
    "desis", "dingin", "error", "gagal", "goyang", "kencang", "kendala", "kerusakan",
    "longgar", "macet", "masalah", "mati", "mendesis", "menyala", "normal", "nyala",
    "panas", "patah", "pecah", "punya", "rembes", "retak", "rusak", "sulit", "sumbat",
    "susah", "tersumbat", "broken", "faulty", "hissing", "leak", "leaking", "loose",
    "noise", "noisy", "problem", "stuck", "unsafe",
})
# Negations and marketing qualifiers fill listing titles and describe nothing that
# distinguishes one product from another.
_GENERIC_QUALIFIER = frozenset({
    "tidak", "tak", "nggak", "gak", "bukan", "belum", "jangan", "tanpa", "mudah",
    "gampang", "awet", "tahan", "kuat", "cepat", "lama", "baru", "asli", "resmi",
    "original", "premium", "terbaik", "terbaru", "berkualitas", "kualitas", "gratis",
    "murah", "hemat", "bagus", "not", "without", "easy", "durable", "strong", "best",
    "new", "genuine", "official", "quality", "free", "cheap",
})
_PRODUCT_NAME_EXCLUSIONS = _SEARCH_STOPWORDS | _SYMPTOM_OR_CONDITION | _GENERIC_QUALIFIER | frozenset({
    "berat", "capacity", "color", "colour", "daya", "deskripsi", "dimension", "fitur",
    "fungsi", "harga", "informasi", "kapasitas", "material", "model", "panduan", "power",
    "return", "refund", "retur", "size", "specification", "spesifikasi", "ukuran", "voltage",
    "warna", "watt", "weight",
})
_TERM_ALIASES = {
    "bahannya": "material", "bahan": "material", "material": "material",
    "capacity": "capacity", "kapasitas": "capacity", "muat": "capacity", "liter": "capacity",
    "colour": "color", "warna": "color", "color": "color",
    "dimension": "size", "dimensions": "size", "dimensi": "size", "ukuran": "size",
    "berat": "weight", "bobot": "weight", "weight": "weight",
    "daya": "power", "listrik": "power", "power": "power", "watt": "power",
    "tegangan": "voltage", "volt": "voltage", "voltage": "voltage",
    "fungsi": "function", "kegunaan": "function", "multifungsi": "function", "serbaguna": "function",
    "install": "install", "installation": "install", "pasang": "install", "pemasangan": "install",
    "panduan": "guide", "petunjuk": "guide", "guide": "guide", "manual": "guide",
    "pengembalian": "return", "refund": "return", "return": "return", "retur": "return",
}


def _words(text: str) -> list[str]:
    """Return stable lexical units while ignoring punctuation and emoji."""
    return re.findall(r"[\w-]+", text.casefold())


def _canonical_terms(text: str, *, keep_stopwords: bool = False) -> list[str]:
    """Normalize bounded lexical variants without inventing semantic content."""
    words = _words(text)
    terms: list[str] = []
    for word in words:
        value = _TERM_ALIASES.get(word, word)
        if keep_stopwords or value not in _SEARCH_STOPWORDS:
            terms.append(value)
    if any(words[index] == "air" and words[index + 1] == "fryer"
           for index in range(len(words) - 1)) or "airfryer" in words:
        terms.append("airfryer")
    return terms


def _sku_parts(value: str) -> tuple[str, ...]:
    return tuple(re.findall(r"[a-z]+|\d+[a-z]*", value.casefold()))


def _mentions_known_sku(text: str, sku: str) -> bool:
    query = tuple(re.findall(r"[a-z]+|\d+[a-z]*", text.casefold()))
    parts = _sku_parts(sku)
    if not parts:
        return False
    return any(query[index:index + len(parts)] == parts
               for index in range(len(query) - len(parts) + 1))


def _known_sku_mentions(text: str, sku_values: list[str] | set[str]) -> set[str]:
    mentioned = {value for value in sku_values if _mentions_known_sku(text, value)}
    if not mentioned:
        return set()
    mentioned = {
        value for value in mentioned
        if not any(
            len(_sku_parts(value)) < len(_sku_parts(other))
            and _sku_parts(other)[:len(_sku_parts(value))] == _sku_parts(value)
            for other in mentioned if other != value
        )
    }
    part_groups = {_sku_parts(value) for value in mentioned}
    if len(part_groups) == 1 and len(mentioned) > 1:
        exact = {value for value in mentioned
                 if re.search(rf"(?<![\w-]){re.escape(value)}(?![\w-])", text, re.I)}
        if exact:
            return {sorted(exact, key=lambda value: (len(value), value.casefold()))[0]}
        return {sorted(mentioned, key=lambda value: (len(value), value.casefold()))[0]}
    return mentioned


def _product_context_resolution(snapshot: dict, text: str,
                                sku: str | None = None) -> tuple[str | None, bool]:
    """Resolve an explicit code or a uniquely named product to its canonical SKU.

    Product-name inference is intentionally strict. A name must contain either a
    complete multi-word source alias or a source token unique to one SKU. Generic
    intent words such as ``capacity`` and ``material`` never identify a product.
    """
    sku_values = sorted({entry["sku"].strip() for entry in snapshot.get("entries", [])
                         if isinstance(entry.get("sku"), str) and entry["sku"].strip()},
                        key=str.casefold)
    canonical = {value.casefold(): value for value in sku_values}
    page_sku = canonical.get(sku.strip().casefold()) if isinstance(sku, str) else None
    if sku is not None and page_sku is None:
        return None, False

    explicit = _known_sku_mentions(text, sku_values)
    if page_sku:
        explicit.add(page_sku)
    if len(explicit) == 1:
        return next(iter(explicit)), False
    if explicit:
        return None, False

    query_terms = _canonical_terms(text)
    query = set(query_terms)
    signatures: dict[str, set[tuple[str, ...]]] = {value: set() for value in sku_values}
    token_skus: dict[str, set[str]] = {}
    for entry in snapshot.get("entries", []):
        entry_sku = entry.get("sku")
        # Only catalog passages author product names. Historical support aliases
        # describe symptoms and must not silently infer a product from wording.
        if (not entry.get("id", "").startswith(("catalog-", "source-"))
                or not isinstance(entry_sku, str) or entry_sku.strip() not in signatures):
            continue
        entry_sku = entry_sku.strip()
        # Remove only the canonical full code. Split code components can also be
        # meaningful parts of an owner-authored product name (for example a
        # model number written without its family prefix).
        sku_terms = set(_canonical_terms(entry_sku))
        for question in entry.get("questions", []):
            name = tuple(term for term in _canonical_terms(question)
                         if term not in _PRODUCT_NAME_EXCLUSIONS and term not in sku_terms)
            if name:
                signatures[entry_sku].add(name)
                for term in name:
                    token_skus.setdefault(term, set()).add(entry_sku)

    match_scores: dict[str, int] = {}
    for entry_sku, aliases in signatures.items():
        for alias in aliases:
            overlap = len(set(alias) & query)
            phrase_match = overlap >= 2
            unique_token_match = any(
                len(term) >= 5 and term in query and token_skus.get(term) == {entry_sku}
                for term in alias
            )
            if phrase_match or unique_token_match:
                match_scores[entry_sku] = max(match_scores.get(entry_sku, 0), overlap)
    if match_scores:
        best = max(match_scores.values())
        winners = {entry_sku for entry_sku, score in match_scores.items() if score == best}
        if len(winners) == 1:
            return next(iter(winners)), False
        return None, True
    return None, False


def resolve_product_context(snapshot: dict, text: str, sku: str | None = None) -> str | None:
    """Return the canonical SKU when product context is uniquely resolvable."""
    return _product_context_resolution(snapshot, text, sku)[0]


def _is_greeting_word(value: str) -> bool:
    return bool(re.fullmatch(r"h+a+l+o+|h+e+l+o+|h+a+i+|h+i+|h+e+y+", value))


def _conversation_words(text: str) -> tuple[str, ...]:
    """Normalize only the narrow variations approved for conversational aliases."""
    source = _words(text)
    normalized: list[str] = []
    index = 0
    while index < len(source):
        value = source[index]
        if value in _POLITE_FILLERS:
            index += 1
            continue
        if _is_greeting_word(value):
            normalized.append("greeting")
        elif (value == "terima" and index + 1 < len(source)
              and re.fullmatch(r"k+a+s+i+h+", source[index + 1])):
            normalized.append("thanks")
            index += 1
        elif (value == "thank" and index + 1 < len(source) and source[index + 1] == "you"):
            normalized.append("thanks")
            index += 1
        elif (re.fullmatch(r"m+a+k+a+s+i+(?:h+)?", value)
              or re.fullmatch(r"t+h+a+n+k+s+", value)
              or value in {"thankyou", "thx", "trims"}):
            normalized.append("thanks")
        else:
            normalized.append(value)
        index += 1
    return tuple(normalized)


def _is_conversational(entry: dict) -> bool:
    return entry["kind"] in ("greeting", "clarification") or entry["id"].startswith("conversation-")


def _conversation_candidates(entries: list[dict], text: str, language: str) -> list[dict]:
    query = _conversation_words(text)
    if not query:
        return []
    accepted = {query}
    # A greeting may introduce a complete explicit conversational alias. Extra
    # unsupported words still prevent a match because the remainder must match
    # a source alias in full.
    if len(query) > 1 and query[0] == "greeting":
        accepted.add(query[1:])
    matches = [entry for entry in entries
               if entry["language"] == language and _is_conversational(entry)
               and any(_conversation_words(question) in accepted for question in entry["questions"])]
    matches.sort(key=lambda entry: entry["id"])
    if len({entry["answer"] for entry in matches}) > 1:
        return []
    return matches[:1]


def _product_query_tokens(text: str) -> list[str]:
    words = _words(text)
    index = 0
    while index < len(words) and words[index] in _POLITE_FILLERS:
        index += 1
    if index + 1 < len(words) and ((words[index] == "selamat" and words[index + 1] in {"pagi", "siang", "sore", "malam"})
                                        or (words[index] == "good" and words[index + 1] in {"morning", "afternoon", "evening"})):
        index += 2
    elif index < len(words) and (_is_greeting_word(words[index]) or words[index] in {"pagi", "siang", "sore", "malam", "morning", "permisi", "assalamualaikum"}):
        index += 1
    while index < len(words) and words[index] in _POLITE_FILLERS:
        index += 1
    return words[index:]


def _unknown_sku_tokens(text: str, known_skus: set[str]) -> set[str]:
    """Find bounded model-like codes without treating dates, prices, or units as SKUs."""
    candidates: set[str] = set()
    for value in _words(text):
        if not 4 <= len(value) <= 40 or not re.fullmatch(r"[a-z]{2,}[a-z0-9]*-[a-z0-9]+(?:-[a-z0-9]+)*", value):
            continue
        prefix = value.split("-", 1)[0]
        if prefix not in _NON_SKU_PREFIXES and any(character.isdigit() for character in value):
            candidates.add(value)
    unknown: set[str] = set()
    for candidate in candidates:
        parts = _sku_parts(candidate)
        if candidate in known_skus or any(_sku_parts(value)[:len(parts)] == parts for value in known_skus):
            continue
        unknown.add(candidate)
    return unknown


def _entry_search_counts(entry: dict) -> tuple[Counter[str], Counter[str]]:
    question_terms: Counter[str] = Counter()
    for question in entry.get("questions", []):
        question_terms.update(_canonical_terms(question))
    return question_terms, Counter(_canonical_terms(entry.get("answer", "")))


def _retrieval_candidates(entries: list[dict], text: str,
                          excluded_terms: set[str] | None = None,
                          *, answer_only_sku: str | None = None) -> list[dict]:
    """Rank exact source passages using a small deterministic BM25-style index."""
    excluded_terms = excluded_terms or set()
    query_terms = [term for term in _canonical_terms(text) if term not in excluded_terms]
    if not query_terms:
        return []
    query = Counter(query_terms)
    documents = [(entry, *_entry_search_counts(entry)) for entry in entries]
    document_frequency = Counter()
    for _, question_counts, answer_counts in documents:
        document_frequency.update(set(question_counts) | set(answer_counts))
    document_count = len(documents)
    exact_query = tuple(query_terms)
    ranked: list[tuple[float, int, dict]] = []
    for entry, question_counts, answer_counts in documents:
        matched = set(query) & (set(question_counts) | set(answer_counts))
        if not matched:
            continue
        scoped_answer_only = (answer_only_sku is not None and entry.get("sku", "").casefold()
                              == answer_only_sku.casefold())
        if not scoped_answer_only and not set(query) & set(question_counts):
            continue
        # A one-word request is safe only when the source has that exact alias or
        # the word is rare in the already product-bounded candidate set.
        exact_alias = any(tuple(term for term in _canonical_terms(question)
                                if term not in excluded_terms) == exact_query
                          for question in entry.get("questions", []))
        if (len(query) == 1 and not exact_alias and not scoped_answer_only
                and document_frequency[next(iter(query))] > 2):
            continue
        coverage = sum(query[term] for term in matched) / sum(query.values())
        if coverage < 0.34:
            continue
        score = 0.0
        for term, query_frequency in query.items():
            question_frequency = question_counts[term]
            answer_frequency = answer_counts[term]
            if not question_frequency and not answer_frequency:
                continue
            inverse_frequency = math.log(1 + (document_count - document_frequency[term] + 0.5)
                                         / (document_frequency[term] + 0.5))
            weighted_frequency = min(question_frequency, 3) * 3.0 + min(answer_frequency, 4) * 0.7
            score += inverse_frequency * weighted_frequency * min(query_frequency, 2)
        if exact_alias:
            score += 8.0
        ranked.append((score, len(matched), entry))
    ranked.sort(key=lambda item: (-item[0], -item[1], item[2]["id"]))
    if not ranked:
        return []

    # Identical aliases with different owner-authored answers are a source
    # contradiction, not a choice for the model to guess.
    exact_entries = [
        entry for _, _, entry in ranked
        if any(tuple(term for term in _canonical_terms(question)
                     if term not in excluded_terms) == exact_query
               for question in entry.get("questions", []))
    ]
    # Catalog passages for one product can be complementary source excerpts.
    # Curated/support answers with the same alias and different bodies remain a
    # contradiction and fail closed.
    exact_groups: dict[str, list[dict]] = {}
    for entry in exact_entries:
        exact_groups.setdefault(entry.get("sku", "").casefold(), []).append(entry)
    for group in exact_groups.values():
        if (len({entry["answer"] for entry in group}) > 1
                and any(not entry["id"].startswith(("source-", "catalog-")) for entry in group)):
            return []

    selected: list[dict] = []
    seen_answers: set[str] = set()
    for _, _, entry in ranked:
        if entry["answer"] in seen_answers:
            continue
        selected.append(entry)
        seen_answers.add(entry["answer"])
        if len(selected) == 5:
            break
    return selected


def _exact_unscoped_candidates(entries: list[dict], text: str, language: str) -> list[dict]:
    query = tuple(_canonical_terms(text))
    if not query:
        return []
    matches = [entry for entry in entries
               if entry["language"] == language and entry["kind"] == "answer"
               and not entry.get("sku") and not _is_conversational(entry)
               and any(tuple(_canonical_terms(question)) == query
                       for question in entry.get("questions", []))]
    if len({entry["answer"] for entry in matches}) > 1:
        return []
    return matches[:1]


def retrieve(snapshot: dict, text: str, language: str, sku: str | None = None) -> list[dict]:
    original_query = tokens(text)
    if not original_query:
        return []
    entries = snapshot.get("entries", [])
    known_skus = {entry["sku"].strip().lower() for entry in entries if entry.get("sku")}
    # A model-like code absent from the active snapshot makes product context
    # uncertain. This also protects a known page hint from conflicting free text.
    if _unknown_sku_tokens(text, known_skus):
        return []
    if sku and sku.strip().lower() not in known_skus:
        return []
    explicitly_mentioned = _known_sku_mentions(text, known_skus)
    if len(explicitly_mentioned | ({sku.strip().lower()} if sku else set())) > 1:
        return []
    conversational = _conversation_candidates(entries, text, language)
    if conversational:
        return conversational
    exact_unscoped = _exact_unscoped_candidates(entries, text, language)
    if exact_unscoped and sku is None:
        return exact_unscoped
    context, ambiguous_name = _product_context_resolution(snapshot, text, sku)
    if ambiguous_name:
        return [entry for entry in entries
                if entry["language"] == language and entry["kind"] == "clarification"][:1]
    eligible = [entry for entry in entries
                if entry["language"] == language and entry["kind"] not in ("handoff", "clarification")
                and not _is_conversational(entry)
                and (not entry.get("sku")
                     or (context is not None and entry["sku"].strip().casefold() == context.casefold()))]
    excluded_terms = set(_canonical_terms(context)) | set(_sku_parts(context)) if context else set()
    product_text = " ".join(_product_query_tokens(text))
    residual_terms = [term for term in _canonical_terms(product_text) if term not in excluded_terms]
    if context and not residual_terms:
        # A bare, known product code is an explicit request for its primary
        # catalog passage. Other intents containing the code still need their
        # own lexical evidence below.
        exact_code_entries = [entry for entry in eligible
                              if entry["id"].startswith(("source-", "catalog-"))
                              and any(_sku_parts(question) == _sku_parts(context)
                                      for question in entry.get("questions", []))]
        return exact_code_entries[:5]
    return _retrieval_candidates(
        eligible,
        product_text,
        excluded_terms,
        answer_only_sku=context,
    )


def parse_selection(raw: str, candidates: list[dict]) -> str | None:
    try:
        payload = json.loads(raw)
        if not isinstance(payload, dict) or set(payload) != {"answerId"}:
            return None
        identifier = payload["answerId"]
        return identifier if isinstance(identifier, str) and identifier in {entry["id"] for entry in candidates} else None
    except (ValueError, TypeError):
        return None
