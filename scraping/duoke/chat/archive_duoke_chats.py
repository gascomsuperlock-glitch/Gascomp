"""Archive authorized Duoke API history into private JSON and Obsidian notes."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import httpx

from scraping.shared.common import read_json, redact_text, stable_hash, utc_now
from scraping.shared.paths import CHAT_ARCHIVE_DIR, ROOT


LIST_PATH = "/api/v1/im/conversation/queryConversationList"
MESSAGE_PATH = "/api/v1/im/message/list"
MANUAL_MARKER = "<!-- Manual notes below this marker are preserved. -->"
CONVERSATION_INDEX_NAME = "Conversation archive index.md"


def note_link(path: Any) -> str:
    """Return the current flat-vault path for generated-note references."""
    value = str(path)
    legacy_prefixes = {
        "Duoke/Produk/Catalog/": ("Duoke/Produk/", "Product catalog index"),
        "Duoke/Percakapan/Archive/": ("Duoke/Percakapan/", "Conversation archive index"),
    }
    target, separator, fragment = value.partition("#")
    for legacy, (current, index_name) in legacy_prefixes.items():
        if target.startswith(legacy):
            suffix = target.removeprefix(legacy)
            if suffix in ("Index", "Index.md"):
                suffix = index_name + (".md" if suffix.endswith(".md") else "")
            flattened = current + suffix
            return flattened + (separator + fragment if separator else "")
    return value


def private_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_suffix(".tmp")
    with os.fdopen(os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as stream:
        json.dump(value, stream, ensure_ascii=False)
        stream.write("\n")
    temporary.replace(path)


def conversation_ref(item: dict[str, Any]) -> str:
    return stable_hash(item["platform"], item["shopId"], item["conversationId"])


def message_key(message: dict[str, Any]) -> str:
    identifier = message.get("messageId") or message.get("id")
    if not identifier:
        raise ValueError("A message is missing its source identity.")
    return str(identifier)


def timestamp(value: Any) -> str:
    try:
        return datetime.fromtimestamp(int(value) / 1000, timezone.utc).isoformat()
    except (ValueError, TypeError, OverflowError, OSError):
        return "Unknown time"


def redact_value(value: Any, buyer: str, buyer_id: str, key: str = "") -> Any:
    """Redact source identities while retaining complete message structure."""
    if isinstance(value, dict):
        return {k: redact_value(v, buyer, buyer_id, k) for k, v in value.items()}
    if isinstance(value, list):
        return [redact_value(v, buyer, buyer_id, key) for v in value]
    if re.search(r"password|token|secret|credential|otp", key, re.I):
        return "[REDACTED]"
    if re.search(r"order.?id|tracking|buyer|customer|recipient|receiver|address|phone|email", key, re.I):
        return "[REDACTED]" if value else value
    if not isinstance(value, str):
        return value
    for identity in (buyer, buyer_id):
        if identity:
            value = re.sub(r"(?<!\w)" + re.escape(identity) + r"(?!\w)", "[CUSTOMER]", value, flags=re.I)
    value = redact_text(value)
    return re.sub(r"(?<![\w-])\d{10,}(?![\w-])", "[IDENTIFIER]", value)


def render_note(record: dict[str, Any]) -> str:
    item = record["conversation"]
    ref = conversation_ref(item)
    shop = str(item.get("shopName") or "Unknown store")
    buyer = str(item.get("buyerNick") or "")
    buyer_id = str(item.get("buyerId") or "")
    messages = sorted(record["messages"], key=lambda m: (
        int(m.get("createdTimestamp") or 0),
        str(m.get("messageSort") or "").zfill(30), message_key(m),
    ))
    lines = [
        "---", "source: duoke", "status: unreviewed_archive",
        f"conversation_ref: {ref}", f"store: {json.dumps(shop, ensure_ascii=False)}",
        f"platform: {json.dumps(item['platform'])}",
        f"captured_at: {record['captured_at']}",
        f"message_count: {len(messages)}", f"expected_message_count: {record['expected_messages']}",
        f"history_complete: {str(record['complete']).lower()}",
        "privacy: automated_redaction", "---", "",
        f"# Percakapan {ref}", "", "[[Conversation archive index|Indeks arsip]]", "",
        "Transkrip ini adalah arsip sumber yang belum ditinjau. Penyamaran otomatis mungkin memerlukan tinjauan manual.",
        "Lampiran biner tidak diunduh; muatan sumber lengkap disimpan dalam arsip lokal privat.",
        "",
    ]
    context = record.get("product_context") or {}
    context_review = record.get("product_context_review") or {}
    related = {item["ref"]: item for matches in context.values() for item in matches}
    if related:
        lines.extend(["## Produk terkait", "", "Tautan mengidentifikasi rujukan produk eksplisit; verifikasi variasinya sebelum menggunakan panduan khusus produk.", ""])
        for item in sorted(related.values(), key=lambda item: item["name"]):
            display = str(item["name"]).replace("|", " / ").replace("[", "(").replace("]", ")").replace("\n", " ")
            lines.append(f"- [[{note_link(item['note'])}|{display}]]")
        lines.append("")
    if context_review:
        lines.extend([f"Konteks produk memerlukan tinjauan untuk {len(context_review)} pesan; lihat penandanya dalam transkrip.", ""])
    lines.extend(["## Transcript", ""])
    for message in messages:
        role = {1: "Pelanggan", 2: "Penjual"}.get(message.get("fromAccountType"), "Sistem atau tidak diketahui")
        kind = str(message.get("messageType") or "unknown")
        lines.extend([f"### {timestamp(message.get('createdTimestamp'))} — {role}", "", f"Tipe: {kind}", ""])
        if message_key(message) in context_review:
            lines.extend(["Tinjauan konteks produk: " + context_review[message_key(message)], ""])
        for match in context.get(message_key(message), []):
            display = str(match["name"]).replace("|", " / ").replace("[", "(").replace("]", ")").replace("\n", " ")
            lines.extend([f"Rujukan produk: [[{note_link(match['note'])}|{display}]] (pencocokan: {match['method']})", ""])
        raw = message.get("messageContent")
        try:
            content = json.loads(raw) if isinstance(raw, str) else raw
        except json.JSONDecodeError:
            content = raw
        content = redact_value(content, buyer, buyer_id)
        if isinstance(content, dict) and set(content) == {"text"}:
            text = str(content["text"])
            lines.extend("> " + line for line in text.splitlines())
        elif isinstance(content, str):
            lines.extend("> " + line for line in content.splitlines())
        else:
            # Indentation prevents source content from closing a Markdown fence.
            lines.extend("    " + line for line in json.dumps(content, ensure_ascii=False, indent=2).splitlines())
        if message.get("quotedMsg"):
            lines.extend(["", "Pesan yang dikutip:", ""])
            quote = redact_value(message["quotedMsg"], buyer, buyer_id)
            lines.extend("    " + line for line in json.dumps(quote, ensure_ascii=False, indent=2).splitlines())
        lines.append("")
    if not messages:
        lines.extend(["API sumber tidak mengembalikan pesan.", ""])
    lines.extend(["## Manual notes", "", MANUAL_MARKER, ""])
    return "\n".join(lines)


def write_note(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    manual = ""
    if path.exists():
        existing = path.read_text()
        if MANUAL_MARKER not in existing:
            raise ValueError("Refusing to overwrite a note without the archive marker.")
        manual = existing.split(MANUAL_MARKER, 1)[1].strip("\n")
    temporary = path.with_suffix(".tmp")
    with os.fdopen(os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as stream:
        stream.write(content + manual + "\n")
    temporary.replace(path)


def render_index(summary: dict[str, Any], items: list[dict[str, Any]], folder: Path) -> str:
    by_ref = {conversation_ref(item): item for item in items}
    groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for entry in summary["conversations"]:
        item = by_ref[entry["ref"]]
        group = (str(item["platform"]), str(item.get("shopName") or "Toko tidak diketahui"))
        groups.setdefault(group, []).append(entry)
    lines = ["# Arsip percakapan Duoke", "", f"Diambil: {summary['finished_at']}", "",
             f"Percakapan: {len(items)}", f"Pesan: {summary['total_messages']}",
             f"Semua riwayat lengkap: {str(summary['complete']).lower()}", "",
             "Cakupan: semua percakapan yang dikembalikan akun berizin tanpa filter toko atau percakapan.",
             "Ini arsip yang belum ditinjau, bukan sumber jawaban yang disetujui.", "",
             "Percakapan dikelompokkan berdasarkan toko dan diurutkan menurut aktivitas terakhir dalam cuplikan daftar.", ""]
    if (folder.parent / "Produk" / "Product catalog index.md").exists():
        lines.extend(["[[Duoke/Produk/Product catalog index|Katalog produk]]", ""])
    for (platform, shop), entries in sorted(groups.items()):
        lines.extend([f"## {shop} ({platform})", "", f"Percakapan: {len(entries)}", ""])
        for entry in sorted(entries, key=lambda x: int(by_ref[x["ref"]].get("lastMessageTimestamp") or 0), reverse=True):
            note = f"Conversation {entry['ref']}"
            date = timestamp(by_ref[entry["ref"]].get("lastMessageTimestamp"))[:10]
            state = "lengkap" if entry["complete"] else "tidak lengkap"
            if (folder / f"{note}.md").exists():
                lines.append(f"- [[{note}|{date} — {note}]] — {entry.get('messages', 0)} pesan; {state}")
            else:
                lines.append(f"- {note} — pengambilan gagal")
        lines.append("")
    lines.extend(["## Manual notes", "", MANUAL_MARKER, ""])
    return "\n".join(lines)


class ArchiveClient:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client
        self.lock = asyncio.Lock()
        self.next_request = 0.0

    async def read(self, method: str, url: str, **kwargs: Any) -> dict[str, Any]:
        parsed = urlsplit(url)
        allowed = (method, parsed.path) in (("POST", LIST_PATH), ("GET", MESSAGE_PATH))
        if parsed.scheme != "https" or parsed.netloc != "web.duoke.com" or not allowed:
            raise ValueError("Only verified Duoke conversation and message reads are allowed.")
        for attempt in range(5):
            async with self.lock:
                await asyncio.sleep(max(0, self.next_request - time.monotonic()))
                self.next_request = time.monotonic() + 0.2
            try:
                response = await self.client.request(method, url, **kwargs)
            except httpx.TransportError:
                if attempt == 4:
                    raise RuntimeError("The source API remained unavailable.") from None
                await asyncio.sleep(2 ** attempt)
                continue
            if response.status_code == 429 or response.status_code >= 500:
                if attempt == 4:
                    raise RuntimeError("The source API retry limit was reached.")
                retry = response.headers.get("retry-after", "")
                try:
                    delay = float(retry)
                except ValueError:
                    try:
                        delay = parsedate_to_datetime(retry).timestamp() - time.time()
                    except (ValueError, TypeError, OverflowError):
                        delay = 2 ** attempt
                self.next_request = max(self.next_request, time.monotonic() + max(delay, 2 ** attempt))
                continue
            if response.status_code != 200:
                raise RuntimeError(f"The source API returned HTTP {response.status_code}.")
            payload = response.json()
            if payload.get("code") != 0 or payload.get("success") is False:
                raise RuntimeError("The source API rejected the request; refresh the authorized session.")
            if not isinstance(payload.get("data"), dict):
                raise ValueError("The source API returned an unexpected data shape.")
            return payload["data"]
        raise RuntimeError("No successful API response.")


async def enumerate_conversations(api: ArchiveClient, session: dict[str, Any]) -> list[dict[str, Any]]:
    items: dict[str, dict[str, Any]] = {}
    seen: set[str] = set()
    offset: str | int = 0
    while True:
        body = {**session["list_body"], "shopIdList": [], "filterGroups": [], "offset": offset}
        data = await api.read("POST", session["list_url"], json=body)
        for item in data["list"]:
            items[conversation_ref(item)] = item
        complete = data["hasMore"] is False
        private_json(CHAT_ARCHIVE_DIR / "conversations.json", {
            "complete": complete, "captured_at": utc_now(), "conversations": list(items.values()),
        })
        if complete:
            return list(items.values())
        offset = data["nextOffset"]
        if not data["list"] or str(offset) in seen:
            raise ValueError("Conversation pagination stalled before reaching the end.")
        seen.add(str(offset))


async def capture_history(api: ArchiveClient, session: dict[str, Any], item: dict[str, Any]) -> dict[str, Any]:
    messages: dict[str, dict[str, Any]] = {}
    page = 1
    expected: int | None = None
    total_pages: int | None = None
    while True:
        data = await api.read("GET", session["message_url"], params={
            "shopId": item["shopId"], "conversationId": item["conversationId"],
            "platform": item["platform"], "language": "id", "pageNo": page, "pageSize": 50,
        })
        current_total = int(data["totalSize"])
        if expected is None:
            expected = current_total
            total_pages = int(data["totalPage"])
        elif current_total != expected or int(data["totalPage"]) != total_pages:
            raise ValueError("History changed during pagination; recapture this conversation.")
        if int(data["pageNo"]) != page:
            raise ValueError("The source API returned a different history page.")
        before = len(messages)
        for message in data["list"]:
            if str(message.get("conversationId")) != str(item["conversationId"]) or str(message.get("shopId")) != str(item["shopId"]):
                raise ValueError("A message belongs to a different conversation.")
            messages[message_key(message)] = message
        if page >= (total_pages or 0):
            break
        if len(messages) == before:
            raise ValueError("History pagination stalled before reaching the end.")
        page += 1
    return {
        "source": "duoke", "captured_at": utc_now(), "conversation": item,
        "messages": list(messages.values()), "expected_messages": expected,
        "pages": page, "complete": len(messages) == expected,
    }


async def run(args: argparse.Namespace) -> int:
    session = json.loads(args.session.read_text())
    folder = args.vault / "Duoke" / "Percakapan"
    semaphore = asyncio.Semaphore(args.concurrency)
    summary: dict[str, Any] = {"started_at": utc_now(), "complete": False, "conversations": []}
    async with httpx.AsyncClient(headers=session["headers"], timeout=30, follow_redirects=False) as client:
        api = ArchiveClient(client)
        snapshot = read_json(CHAT_ARCHIVE_DIR / "conversations.json", {}) if args.resume else {}
        items = snapshot["conversations"] if snapshot.get("complete") else await enumerate_conversations(api, session)
        print(f"Discovered {len(items)} conversations across {len({x['shopId'] for x in items})} stores.", flush=True)

        async def capture(item: dict[str, Any]) -> None:
            async with semaphore:
                ref = conversation_ref(item)
                path = CHAT_ARCHIVE_DIR / "conversations" / f"{ref}.json"
                entry: dict[str, Any] = {"ref": ref, "complete": False}
                try:
                    record = read_json(path, {}) if args.resume else {}
                    reusable = (
                        record.get("complete") and record.get("conversation", {}).get("latestMessageId") == item.get("latestMessageId")
                        and len(record.get("messages", [])) == record.get("expected_messages")
                    )
                    if not reusable:
                        record = await capture_history(api, session, item)
                        private_json(path, record)
                    write_note(folder / f"Conversation {ref}.md", render_note(record))
                    entry.update({"complete": record["complete"], "messages": len(record["messages"]), "pages": record["pages"]})
                    if not record["complete"]:
                        entry["error"] = "Unique message count differs from the source total."
                except Exception as error:
                    # Exception values may include private request URLs or content.
                    entry["error"] = type(error).__name__
                summary["conversations"].append(entry)
                private_json(CHAT_ARCHIVE_DIR / "manifest.json", summary)
                count = len(summary["conversations"])
                if count % 25 == 0 or count == len(items):
                    successful = sum(x["complete"] for x in summary["conversations"])
                    print(f"Processed {count}/{len(items)}; complete {successful}; incomplete {count-successful}.", flush=True)

        await asyncio.gather(*(capture(item) for item in items))
    summary["finished_at"] = utc_now()
    summary["complete"] = all(x["complete"] for x in summary["conversations"])
    summary["total_conversations"] = len(items)
    summary["total_messages"] = sum(x.get("messages", 0) for x in summary["conversations"])
    private_json(CHAT_ARCHIVE_DIR / "manifest.json", summary)
    write_note(folder / CONVERSATION_INDEX_NAME, render_index(summary, items, folder))
    print(f"Archive finished: {summary['total_messages']} messages; complete={summary['complete']}.", flush=True)
    return 0 if summary["complete"] else 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", type=Path, default=CHAT_ARCHIVE_DIR / "session.json")
    parser.add_argument("--vault", type=Path, required=True, help="Existing authorized Obsidian vault")
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--resume", action="store_true", help="Reuse the completed list snapshot and unchanged complete histories")
    args = parser.parse_args()
    if not 1 <= args.concurrency <= 5:
        parser.error("Concurrency must be between one and five.")
    if not args.vault.is_absolute():
        args.vault = ROOT / args.vault
    if not args.vault.is_dir():
        parser.error("The Obsidian vault must already exist.")
    return asyncio.run(run(args))


if __name__ == "__main__":
    raise SystemExit(main())
