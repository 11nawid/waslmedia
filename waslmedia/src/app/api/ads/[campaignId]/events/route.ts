import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { getCurrentAuthUser } from '@/server/services/auth';
import { recordSponsoredAdEvent } from '@/server/services/ads';

const bodySchema = z.object({
  eventType: z.enum(['impression', 'click', 'dismiss', 'watch']),
  surface: z.enum(['home', 'search']),
  viewerKey: z.string().trim().optional().nullable(),
  searchQuery: z.string().trim().optional().nullable(),
});

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  await ensureDatabaseSetup();
  const { campaignId } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_AD_EVENT_PAYLOAD' }, { status: 400 });
  }

  const user = await getCurrentAuthUser();
  const ad = await recordSponsoredAdEvent({
    campaignId,
    eventType: parsed.data.eventType,
    surface: parsed.data.surface,
    viewerUserId: user?.id || null,
    viewerKey: parsed.data.viewerKey || null,
    searchQuery: parsed.data.searchQuery || null,
  });

  return NextResponse.json({ ad });
}
