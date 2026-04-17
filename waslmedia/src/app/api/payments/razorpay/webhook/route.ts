import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSetup } from '@/db/bootstrap';
import { handleRazorpayWebhook } from '@/server/services/ads';

export async function POST(request: NextRequest) {
  await ensureDatabaseSetup();
  const payload = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  try {
    const result = await handleRazorpayWebhook(payload, signature);
    return NextResponse.json(result || { handled: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'RAZORPAY_WEBHOOK_FAILED';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
