import { NextResponse } from 'next/server';
import { searchHelpCenterDocuments } from '@/lib/help-center-content';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const limitParam = Number.parseInt(searchParams.get('limit') || '6', 10);
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 12)) : 6;

  const results = searchHelpCenterDocuments(query, limit).map(({ body: _body, ...document }) => document);

  return NextResponse.json({ results });
}
