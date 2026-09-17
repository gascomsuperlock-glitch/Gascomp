import { handleWorker } from "@/features/ai-assistance/server/handlers";
export const runtime = "nodejs";
export const POST = (request: Request) => handleWorker(request, "claim");
