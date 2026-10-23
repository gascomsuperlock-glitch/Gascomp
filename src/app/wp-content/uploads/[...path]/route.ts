import { legacyMedia } from "@/features/main-site/server/media";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return legacyMedia((await params).path);
}
