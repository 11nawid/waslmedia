import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireAdminRoutePermissionFromRequest } from '@/server/http/admin-route-auth';
import { reviewAdCampaignAsStaff } from '@/server/services/admin';

const bodySchema = z.object({
  action: z.enum(['approved', 'rejected']),
  notes: z.string().trim().optional().nullable(),
  rejectionReasonCode: z
    .enum([
      'misleading_claims',
      'landing_page_mismatch',
      'invalid_website',
      'copyright_issue',
      'unsafe_or_prohibited',
      'low_quality_creative',
      'invalid_format',
      'other',
    ])
    .optional()
    .nullable(),
  rejectionCustomReason: z.string().trim().optional().nullable(),
  notifyMode: z.enum(['in_app', 'email', 'both']).optional().nullable(),
});

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const auth = await requireAdminRoutePermissionFromRequest(request, 'review_ads');
  if (auth.response) {
    return auth.response;
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_AD_REVIEW_PAYLOAD' }, { status: 400 });
  }

  const { campaignId } = await context.params;
  const result = await reviewAdCampaignAsStaff({
    campaignId,
    action: parsed.data.action,
    notes: parsed.data.notes || null,
    rejectionReasonCode: parsed.data.rejectionReasonCode || null,
    rejectionCustomReason: parsed.data.rejectionCustomReason || null,
    notifyMode: parsed.data.notifyMode || null,
    actor: auth.viewer,
  });

  return NextResponse.json(result);
}
