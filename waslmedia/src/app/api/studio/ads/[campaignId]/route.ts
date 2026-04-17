import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { createOrUpdateAdDraft, deleteCampaign, getStudioAdCampaignForUser, getStudioAdsOverview } from '@/server/services/ads';

const updateAdDraftSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  websiteUrl: z.string().trim().min(1).optional(),
  ctaLabel: z.string().trim().min(1).max(60).optional(),
  placement: z.enum(['home', 'search', 'both']).optional(),
  videoStorageRef: z.string().trim().min(1).optional(),
  thumbnailStorageRef: z.string().trim().min(1).optional(),
  extractedThumbnailStorageRef: z.string().trim().optional().nullable(),
  selectedThumbnailSource: z.enum(['extracted', 'custom']).optional(),
  videoDurationSeconds: z.number().positive().optional(),
  videoWidth: z.number().int().positive().optional(),
  videoHeight: z.number().int().positive().optional(),
  videoMimeType: z.string().trim().min(1).optional(),
  thumbnailMimeType: z.string().trim().optional().nullable(),
});

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const { campaignId } = await context.params;

  try {
    return NextResponse.json(await getStudioAdCampaignForUser(auth.user.id, campaignId));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AD_CAMPAIGN_NOT_FOUND';
    return NextResponse.json({ error: message }, { status: message === 'AD_CAMPAIGN_NOT_FOUND' ? 404 : 400 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const { campaignId } = await context.params;
  const parsed = updateAdDraftSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_AD_UPDATE_PAYLOAD' }, { status: 400 });
  }

  const existingPayload = await getStudioAdCampaignForUser(auth.user.id, campaignId).catch(() => null);
  const existing = existingPayload?.campaign;
  const existingCreative = existingPayload?.creative;
  if (!existing || existing.id !== campaignId || !existingCreative) {
    return NextResponse.json({ error: 'AD_CAMPAIGN_NOT_FOUND' }, { status: 404 });
  }

  const input = {
    title: parsed.data.title ?? existingCreative.title,
    description: parsed.data.description ?? existingCreative.description,
    websiteUrl: parsed.data.websiteUrl ?? existingCreative.websiteUrl,
    ctaLabel: parsed.data.ctaLabel ?? existingCreative.ctaLabel,
    placement: parsed.data.placement ?? existing.placement,
    videoStorageRef: parsed.data.videoStorageRef ?? existingCreative.videoStorageRef,
    thumbnailStorageRef: parsed.data.thumbnailStorageRef ?? existingCreative.thumbnailStorageRef,
    extractedThumbnailStorageRef:
      parsed.data.extractedThumbnailStorageRef === undefined
        ? existingCreative.extractedThumbnailStorageRef
        : parsed.data.extractedThumbnailStorageRef,
    selectedThumbnailSource: parsed.data.selectedThumbnailSource ?? existingCreative.selectedThumbnailSource,
    videoDurationSeconds: parsed.data.videoDurationSeconds ?? existingCreative.videoDurationSeconds,
    videoWidth: parsed.data.videoWidth ?? existingCreative.videoWidth,
    videoHeight: parsed.data.videoHeight ?? existingCreative.videoHeight,
    videoMimeType: parsed.data.videoMimeType ?? existingCreative.videoMimeType,
    thumbnailMimeType:
      parsed.data.thumbnailMimeType === undefined
        ? existingCreative.thumbnailMimeType
        : parsed.data.thumbnailMimeType,
  };

  await createOrUpdateAdDraft(auth.user.id, input);
  return NextResponse.json({ overview: await getStudioAdsOverview(auth.user.id) });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const { campaignId } = await context.params;

  try {
    const result = await deleteCampaign(auth.user.id, campaignId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AD_CAMPAIGN_DELETE_FAILED';
    const status =
      message === 'AD_CAMPAIGN_NOT_FOUND'
        ? 404
        : message === 'AD_CAMPAIGN_DELETE_NOT_ALLOWED'
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
