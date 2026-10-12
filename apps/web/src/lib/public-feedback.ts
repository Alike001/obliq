import "server-only";

import { parsePublicFeedbackUrl } from "@obliq/security";

export function publicFeedbackUrl() {
  return parsePublicFeedbackUrl(process.env.OBLIQ_PUBLIC_FEEDBACK_URL);
}
