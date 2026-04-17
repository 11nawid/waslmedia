'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { completeAdCheckoutRedirectClient, getReadableRazorpayError } from '@/lib/ads/client';
import { useProgressRouter } from '@/hooks/use-progress-router';

type CheckoutState = 'launching' | 'retryable' | 'invalid';

export function CheckoutFallbackClient() {
  const router = useProgressRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CheckoutState>('launching');
  const [message, setMessage] = useState('Preparing secure checkout...');

  const payload = useMemo(() => {
    const campaignId = searchParams?.get('campaignId') || '';
    const title = searchParams?.get('title') || 'Waslmedia Ads';
    const orderId = searchParams?.get('orderId') || '';
    const amountPaise = Number(searchParams?.get('amountPaise') || '0');
    const currency = searchParams?.get('currency') || 'INR';
    const keyId = searchParams?.get('keyId') || '';
    const customerName = searchParams?.get('customerName') || '';
    const customerEmail = searchParams?.get('customerEmail') || '';

    if (!campaignId || !orderId || !keyId || !Number.isFinite(amountPaise) || amountPaise <= 0) {
      return null;
    }

    return {
      campaignId,
      title,
      orderId,
      amountPaise,
      currency,
      keyId,
      customer: {
        name: customerName,
        email: customerEmail,
      },
    };
  }, [searchParams]);

  const launchCheckout = useCallback(async () => {
    if (!payload) {
      setStatus('invalid');
      setMessage('The payment session is incomplete. Return to Studio Ads and start payment again.');
      return;
    }

    setStatus('launching');
    setMessage('Preparing secure checkout...');

    try {
      await completeAdCheckoutRedirectClient(payload);
      setMessage('Opening secure checkout...');
    } catch (error) {
      const paymentError = getReadableRazorpayError(error);

      if (paymentError.code === 'RAZORPAY_CHECKOUT_DISMISSED') {
        router.replace('/studio/ads');
        return;
      }

      setStatus('retryable');
      setMessage(paymentError.description);
    }
  }, [payload, router]);

  useEffect(() => {
    document.body.style.removeProperty('pointer-events');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('pointer-events');
    document.documentElement.style.removeProperty('overflow');
    document.body.removeAttribute('data-scroll-locked');
    document.documentElement.removeAttribute('data-scroll-locked');
    document.querySelectorAll('[data-radix-portal]').forEach((node) => {
      if (node instanceof HTMLElement) {
        node.remove();
      }
    });
    void launchCheckout();
  }, [launchCheckout]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid h-24 w-24 place-items-center rounded-[30px] border border-border/70 bg-secondary/20">
          {status === 'launching' ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <ShieldCheck className="h-10 w-10 text-primary" />
          )}
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Secure payment</p>
      <h1 className="mt-4 text-4xl font-black tracking-tight">
        {status === 'retryable' ? 'Checkout still needs your browser' : 'Opening Razorpay checkout'}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{message}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {status === 'retryable' ? (
          <Button className="rounded-full px-5" onClick={() => void launchCheckout()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try secure checkout again
          </Button>
        ) : null}
        <Button variant="outline" className="rounded-full px-5" onClick={() => router.replace('/studio/ads')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Studio Ads
        </Button>
      </div>
    </div>
  );
}
