import { createFeedbackSubmission } from '@/server/repositories/feedback-submissions';

const MAX_FEEDBACK_LENGTH = 5000;
export const MAX_FEEDBACK_ATTACHMENT_BYTES = 10 * 1024 * 1024 - 1;

function normalizeFeedbackMessage(message: string) {
  return message.replace(/\s+/g, ' ').trim();
}

export async function submitFeedback(input: {
  userId: string;
  emailSnapshot?: string | null;
  page?: string | null;
  message: string;
  attachment?: {
    bucket: string;
    objectKey: string;
    name: string;
    contentType?: string | null;
    sizeBytes: number;
  } | null;
}) {
  const message = normalizeFeedbackMessage(input.message);
  if (!message) {
    throw new Error('INVALID_FEEDBACK_MESSAGE');
  }

  if (message.length > MAX_FEEDBACK_LENGTH) {
    throw new Error('FEEDBACK_TOO_LONG');
  }

  if (input.attachment) {
    if (!input.attachment.bucket || !input.attachment.objectKey || !input.attachment.name) {
      throw new Error('INVALID_FEEDBACK_ATTACHMENT');
    }

    if (input.attachment.sizeBytes >= MAX_FEEDBACK_ATTACHMENT_BYTES + 1) {
      throw new Error('FEEDBACK_ATTACHMENT_TOO_LARGE');
    }
  }

  return createFeedbackSubmission({
    userId: input.userId,
    emailSnapshot: input.emailSnapshot,
    page: input.page,
    message,
    attachment: input.attachment || null,
  });
}
