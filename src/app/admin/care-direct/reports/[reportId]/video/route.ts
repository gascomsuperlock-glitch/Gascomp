import { getCareDirectVideo } from "@/features/care-direct/server/admin-route";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ reportId: string }> }) {
  return getCareDirectVideo(request, (await context.params).reportId);
}
export const HEAD = GET;
