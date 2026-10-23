import { mainSiteMedia } from "@/features/main-site/server/media";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  return mainSiteMedia((await params).file);
}
