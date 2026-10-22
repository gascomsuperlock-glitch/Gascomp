import "server-only";
import { parseCareDirectInput, SUBMISSION_ID_PATTERN } from "../model/input";
import { detectVideoContainer, UNREADABLE_VIDEO_ERROR, UNSUPPORTED_VIDEO_ERROR } from "@/shared/media/video-evidence";
import { inspectVideo } from "@/shared/media/server/video-inspection";
import { saveCareDirectReport, SubmissionConflict } from "./report-store";
let activeSubmissions = 0;
export async function createCareDirectReport(form: FormData) {
  if (form.get("company")) return { status: 400, body: { error: "The submission could not be processed." } };
  if (activeSubmissions >= 4) return { status: 503, body: { error: "The service is busy. Please try again shortly with the same details." } };
  activeSubmissions++;
  try { return await processCareDirectReport(form); }
  finally { activeSubmissions--; }
}
async function processCareDirectReport(form: FormData) {
  const { input, video, fieldErrors } = parseCareDirectInput(form);
  if (!SUBMISSION_ID_PATTERN.test(input.submissionId)) return { status: 400, body: { error: "Reload the page before submitting your report." } };
  if (Object.keys(fieldErrors).length) return { status: 400, body: { error: "Check the highlighted fields.", fieldErrors } };
  const file = video as File;
  try {
    const container = await detectVideoContainer(file);
    if (!container) return { status: 400, body: { error: UNSUPPORTED_VIDEO_ERROR, fieldErrors: { video: UNSUPPORTED_VIDEO_ERROR } } };
    const inspection = await inspectVideo(file);
    if (inspection !== "valid") {
      const error = inspection === "invalid" ? UNREADABLE_VIDEO_ERROR : "Video verification is temporarily unavailable. Please try again.";
      return { status: inspection === "invalid" ? 400 : 503, body: { error, fieldErrors: { video: error } } };
    }
    const report = await saveCareDirectReport(input, file, container.mimeType);
    return { status: 200, body: { success: true, reportId: report.id } };
  } catch (error) {
    if (error instanceof SubmissionConflict) return { status: 409, body: { error: error.message } };
    console.error("CareDirect submission storage failed");
    return { status: 503, body: { error: "Your report could not be confirmed. Please try again with the same details." } };
  }
}
