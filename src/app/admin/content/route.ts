import { handleContentSave } from "@/features/catalog/server/save-handler";
import { handleContentReadback } from "@/features/catalog/server/save-readback-handler";

export const POST = handleContentSave;
export const GET = handleContentReadback;
