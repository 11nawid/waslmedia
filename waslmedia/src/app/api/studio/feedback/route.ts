import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { MAX_FEEDBACK_ATTACHMENT_BYTES, submitFeedback } from '@/server/services/feedback';

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  let page: string | null = null;
  let message = '';
  let attachment:
    | {
        bucket: string;
        objectKey: string;
        name: string;
        contentType?: string | null;
        sizeBytes: number;
      }
    | null = null;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  page = typeof body.page === 'string' ? body.page.trim() : null;
  message = typeof body.message === 'string' ? body.message : '';
  if (body.attachment && typeof body.attachment === 'object') {
    const nextAttachment = body.attachment as Record<string, unknown>;
    const bucket = typeof nextAttachment.bucket === 'string' ? nextAttachment.bucket : '';
    const objectKey = typeof nextAttachment.objectKey === 'string' ? nextAttachment.objectKey : '';
    const sizeBytes = typeof nextAttachment.sizeBytes === 'number' ? nextAttachment.sizeBytes : 0;

    if (sizeBytes >= MAX_FEEDBACK_ATTACHMENT_BYTES + 1) {
      return NextResponse.json({ error: 'FEEDBACK_ATTACHMENT_TOO_LARGE' }, { status: 400 });
    }

    if (bucket === 'feedback' && objectKey.startsWith(`${auth.user.id}/feedback/`)) {
      attachment = {
        bucket,
        objectKey,
        name: typeof nextAttachment.name === 'string' ? nextAttachment.name : 'attachment',
        contentType: typeof nextAttachment.contentType === 'string' ? nextAttachment.contentType : null,
        sizeBytes,
      };
    }
  }

  try {
    const submission = await submitFeedback({
      userId: auth.user.id,
      emailSnapshot: auth.user.email,
      page,
      message,
      attachment,
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'FEEDBACK_SUBMISSION_FAILED';
    const status =
      code === 'INVALID_FEEDBACK_MESSAGE' ||
      code === 'FEEDBACK_TOO_LONG' ||
      code === 'INVALID_FEEDBACK_ATTACHMENT' ||
      code === 'FEEDBACK_ATTACHMENT_TOO_LARGE'
        ? 400
        : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
