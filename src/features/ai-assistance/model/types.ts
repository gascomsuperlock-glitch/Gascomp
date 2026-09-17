export type AssistanceLanguage = "en" | "id";
export type KnowledgeEntry = {
  id: string;
  kind: "answer" | "greeting" | "clarification" | "handoff";
  language: AssistanceLanguage;
  questions: string[];
  sku?: string;
  answer: string;
};
export type KnowledgeSnapshot = { version: string; entries: KnowledgeEntry[] };
export type ChatMessage = { id: string; role: "user" | "assistant"; text: string; status?: string; createdAt: string };
export type ChatState = {
  messages: ChatMessage[];
  availability: "ready" | "offline" | "paused" | "unavailable";
  pending: boolean;
  greeting: string | null;
  handoff: string | null;
};
export type AssistanceStatus = {
  enabled: boolean;
  paused: boolean;
  workerOnline: boolean;
  knowledgeReady: boolean;
  knowledgeVersion: string | null;
  queuedJobs: number;
  lastHeartbeat: string | null;
};
