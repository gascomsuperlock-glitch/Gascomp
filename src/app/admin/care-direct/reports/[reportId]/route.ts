import { patchCareDirectReport } from "@/features/care-direct/server/admin-route";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ reportId: string }> }) {
  return patchCareDirectReport(request, (await context.params).reportId);
}
