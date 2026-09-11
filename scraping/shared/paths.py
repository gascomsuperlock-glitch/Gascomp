"""Stable locations shared by the automation commands."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRIVATE_DIR = ROOT / "scraping" / ".private"
PROFILE_DIR = PRIVATE_DIR / "browser-profile"
CHAT_CAPTURE_DIR = PRIVATE_DIR / "chat-captures"
REVIEW_DIR = ROOT / "obsidian" / "knowledge" / "pending"
APPROVED_DIR = ROOT / "obsidian" / "knowledge" / "approved"
KNOWLEDGE_PATH = ROOT / "data" / "knowledge" / "duoke-knowledge.json"
REVIEWED_KNOWLEDGE_PATH = ROOT / "data" / "knowledge" / "duoke-reviewed-knowledge.json"
BOT_MESSAGES_PATH = ROOT / "data" / "knowledge" / "duoke-bot-messages.json"
AUTOREPLY_LOG = PRIVATE_DIR / "autoreply-audit.jsonl"
AUTOREPLY_STATE = PRIVATE_DIR / "autoreply-state.json"
STOP_FILE = PRIVATE_DIR / "STOP_AUTOREPLY"

CATALOG_PATH = ROOT / "data" / "catalog" / "duoke-products.json"
REPORT_PATH = ROOT / "data" / "reports" / "duoke-sync-report.json"
CAPTURE_DIR = PRIVATE_DIR / "captures"
VAULT_DIR = ROOT / "obsidian"
