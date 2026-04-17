import { randomUUID } from 'crypto';
import { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';

export interface FeedbackSubmissionRow extends RowDataPacket {
  id: string;
  user_id: string;
  email_snapshot: string | null;
  page: string | null;
  message: string;
  attachment_bucket: string | null;
  attachment_object_key: string | null;
  attachment_name: string | null;
  attachment_content_type: string | null;
  attachment_size_bytes: number | null;
  created_at: Date | string;
}

export async function createFeedbackSubmission(input: {
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
  const id = randomUUID();
  await dbPool.query(
    `INSERT INTO feedback_submissions (
      id,
      user_id,
      email_snapshot,
      page,
      message,
      attachment_bucket,
      attachment_object_key,
      attachment_name,
      attachment_content_type,
      attachment_size_bytes
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.emailSnapshot || null,
      input.page || null,
      input.message,
      input.attachment?.bucket || null,
      input.attachment?.objectKey || null,
      input.attachment?.name || null,
      input.attachment?.contentType || null,
      input.attachment?.sizeBytes ?? null,
    ]
  );

  const [rows] = await dbPool.query<FeedbackSubmissionRow[]>(
    `SELECT id, user_id, email_snapshot, page, message,
            attachment_bucket, attachment_object_key, attachment_name,
            attachment_content_type, attachment_size_bytes, created_at
     FROM feedback_submissions
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}
