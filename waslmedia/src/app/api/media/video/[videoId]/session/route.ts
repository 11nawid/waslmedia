import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    {
      error: 'DEPRECATED_MEDIA_SESSION_ROUTE',
    },
    {
      status: 410,
    }
  );
}
