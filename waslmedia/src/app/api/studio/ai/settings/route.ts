import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { requireRouteUser } from '@/server/http/route-auth';
import { getStudioAiSettings, saveStudioAiSettings } from '@/server/services/studio-ai';

export async function GET() {
  try {
    await ensureDatabaseSetup();
    const auth = await requireRouteUser();
    if (auth.response) {
      return auth.response;
    }

    const settings = await getStudioAiSettings(auth.user.id);
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: 'AI_SETTINGS_LOAD_FAILED' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const auth = await requireRouteUser();
  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  try {
    const settings = await saveStudioAiSettings({
      userId: auth.user.id,
      providerKind: body.providerKind,
      providerLabel: body.providerLabel,
      baseUrl: body.baseUrl,
      model: body.model,
      apiKey: body.apiKey,
      endpointMode: body.endpointMode,
      streamEnabled: body.streamEnabled,
      clearApiKey: body.clearApiKey,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'AI_SETTINGS_SAVE_FAILED';
    if (code.startsWith('INVALID_')) {
      return NextResponse.json({ error: code }, { status: 400 });
    }

    return NextResponse.json({ error: 'AI_SETTINGS_SAVE_FAILED' }, { status: 500 });
  }
}
