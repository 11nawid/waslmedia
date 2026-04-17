import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { createOrUpdateAdDraft, getStudioAdsOverview } from '@/server/services/ads';

const createAdDraftSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  websiteUrl: z.string().trim().min(1),
  ctaLabel: z.string().trim().min(1).max(60),
  placement: z.enum(['home', 'search', 'both']),
  videoStorageRef: z.string().trim().min(1),
  thumbnailStorageRef: z.string().trim().min(1),
  extractedThumbnailStorageRef: z.string().trim().optional().nullable(),
  selectedThumbnailSource: z.enum(['extracted', 'custom']),
  videoDurationSeconds: z.number().positive(),
  videoWidth: z.number().int().positive(),
  videoHeight: z.number().int().positive(),
  videoMimeType: z.string().trim().min(1),
  thumbnailMimeType: z.string().trim().optional().nullable(),
});

export async function GET() {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const overview = await getStudioAdsOverview(auth.user.id);
  return NextResponse.json(overview);
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const parsed = createAdDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_AD_DRAFT_PAYLOAD' }, { status: 400 });
  }

  await createOrUpdateAdDraft(auth.user.id, parsed.data);
  const overview = await getStudioAdsOverview(auth.user.id);
  return NextResponse.json({ overview });
}
