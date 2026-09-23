"""Stable locations shared by the automation commands."""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# The knowledge vault lives in the douke-chat workspace next to this repository.
DEFAULT_VAULT_DIR = ROOT.parent / "douke-chat" / "knowledge" / "approved" / "Douke Knowledge Base"
VAULT_DIR = Path(os.environ.get("DOUKE_VAULT_DIR") or DEFAULT_VAULT_DIR).expanduser()
# Every knowledge tree the assistant reads lives under one Duoke root, so
# generated notes stay inside the directory GASCOMP_AI_SOURCE_VAULT points at.
DUOKE_DIR = VAULT_DIR / "Duoke"
PRIVATE_DIR = ROOT / "scraping" / ".private"
PROFILE_DIR = PRIVATE_DIR / "browser-profile"
CHAT_CAPTURE_DIR = PRIVATE_DIR / "chat-captures"
CHAT_ARCHIVE_DIR = PRIVATE_DIR / "chat-archive"
PRODUCT_ARCHIVE_DIR = PRIVATE_DIR / "product-archive"
REVIEW_DIR = DUOKE_DIR / "knowledge" / "pending"
APPROVED_DIR = DUOKE_DIR / "knowledge" / "approved"
KNOWLEDGE_PATH = ROOT / "data" / "knowledge" / "duoke-knowledge.json"
REVIEWED_KNOWLEDGE_PATH = ROOT / "data" / "knowledge" / "duoke-reviewed-knowledge.json"
BOT_MESSAGES_PATH = ROOT / "data" / "knowledge" / "duoke-bot-messages.json"
AUTOREPLY_LOG = PRIVATE_DIR / "autoreply-audit.jsonl"
AUTOREPLY_STATE = PRIVATE_DIR / "autoreply-state.json"
STOP_FILE = PRIVATE_DIR / "STOP_AUTOREPLY"
DUOKE_DRAFT_DIR = PRIVATE_DIR / "duoke-drafts"
DUOKE_DESKTOP_DIR = PRIVATE_DIR / "duoke-desktop"
DUOKE_DESKTOP_STORAGE = DUOKE_DESKTOP_DIR / "browser-storage.json"
DUOKE_DESKTOP_STATE = DUOKE_DESKTOP_DIR / "delivery-state.json"
DUOKE_DESKTOP_ENABLED = DUOKE_DESKTOP_DIR / "DELIVERY_ENABLED"

CATALOG_PATH = ROOT / "data" / "catalog" / "duoke-products.json"
REPORT_PATH = ROOT / "data" / "reports" / "duoke-sync-report.json"
CAPTURE_DIR = PRIVATE_DIR / "captures"
AI_ASSISTANCE_VAULT = VAULT_DIR / "customer-support"
AI_ASSISTANCE_PRIVATE_DIR = PRIVATE_DIR / "ai-assistance"
AI_ASSISTANCE_HERMES_HOME = AI_ASSISTANCE_PRIVATE_DIR / "hermes"
AI_ASSISTANCE_SERVICE_ENV = AI_ASSISTANCE_PRIVATE_DIR / "services" / "worker-environment.json"
