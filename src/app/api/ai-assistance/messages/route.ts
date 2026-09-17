import { handleMessages } from "@/features/ai-assistance/server/handlers";
export const runtime = "nodejs";
export const GET = handleMessages;
export const POST = handleMessages;
