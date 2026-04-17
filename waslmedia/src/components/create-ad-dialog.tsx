'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { CalendarRange, CheckCircle2, ImagePlus, Loader2, Trash2, UploadCloud, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCreateAdDialog } from '@/hooks/use-create-ad-dialog';
import { CreateAdDialogStepper, type CreateAdStep, type CreateAdStepState } from './create-ad-dialog-config';
import { inspectVideoFile, generateVideoThumbnailFile } from './upload-dialog-helpers';
import { uploadFileToStorage } from '@/lib/storage/client';
import { sanitizeFileName } from '@/lib/storage/shared';
import {
  completeAdCheckoutClient,
  createAdOrderClient,
  getAdPackagesClient,
  getReadableRazorpayError,
  getStudioAdCampaignClient,
  getStudioAdsOverviewClient,
  saveAdDraftClient,
  startAdCheckoutRedirectFallback,
  updateAdDraftClient,
} from '@/lib/ads/client';
import { ADS_SYNC_EVENT } from '@/lib/ads/feed';
import type { AdPackage, CreateAdDraftInput, StudioAdsOverview } from '@/lib/ads/types';
import { emitWalletSync } from '@/lib/wallet/client';
import { cn } from '@/lib/utils';

const placements = [{ value: 'home', label: 'Home' }, { value: 'search', label: 'Search' }, { value: 'both', label: 'Home + Search' }] as const;
type Placement = (typeof placements)[number]['value'];
type FormState = { title: string; description: string; websiteUrl: string; ctaLabel: string; placement: Placement; videoFile: File | null; autoThumbnailFile: File | null; customThumbnailFile: File | null; seconds: number; width: number; height: number; };

const initialForm: FormState = { title: '', description: '', websiteUrl: '', ctaLabel: 'Start now', placement: 'both', videoFile: null, autoThumbnailFile: null, customThumbnailFile: null, seconds: 0, width: 0, height: 0 };

function priceLabel(pkg: AdPackage) { return `Rs ${((pkg.pricePaise + Math.round(pkg.pricePaise * (pkg.gstPercent / 100))) / 100).toLocaleString('en-IN')}`; }
function formatCurrencyFromPaise(value: number) { return `Rs ${(value / 100).toLocaleString('en-IN')}`; }
function objectKey(prefix: string, file: File) { return `ads/${prefix}/${Date.now()}-${sanitizeFileName(file.name || prefix)}`; }
function stepIndex(step: CreateAdStep) { return step === 'media' ? 0 : step === 'details' ? 1 : step === 'placement' ? 2 : 3; }
function safeDomain(url: string) { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, ''); } catch { return 'website.com'; } }
function resolveEditableStep(overview: StudioAdsOverview | null, requestedStep?: CreateAdStep | null): CreateAdStep {
  if (requestedStep && requestedStep !== 'published') {
    return requestedStep;
  }

  const campaign = overview?.campaign;
  const creative = overview?.creative;

  if (!campaign || !creative || !creative.videoStorageRef || !creative.thumbnailStorageRef) {
    return 'media';
  }

  if (!creative.title.trim() || !creative.description.trim() || !creative.websiteUrl.trim() || !creative.ctaLabel.trim()) {
    return 'details';
  }

  if (!campaign.packageId || campaign.paymentStatus !== 'paid') {
    return 'pricing';
  }

  return 'details';
}
function PlacementPreview({ title, description, active, type }: { title: string; description: string; active: boolean; type: 'home' | 'search' }) {
  return (
    <div className={cn('rounded-[24px] border p-4 transition-colors', active ? 'border-primary bg-primary/5' : 'border-border/70 bg-secondary/10')}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4 overflow-hidden rounded-[20px] border border-border/60 bg-background p-3">
        {type === 'home' ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 rounded-2xl border border-primary/40 bg-primary/10 p-2">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/50 to-primary/15" />
              <div className="h-3 w-11/12 rounded-full bg-foreground/20" />
              <div className="h-3 w-2/3 rounded-full bg-muted/70" />
            </div>
            {Array.from({ length: 5 }).map((_, index) => <div key={index} className="space-y-2"><div className="aspect-video rounded-xl bg-muted/65" /><div className="h-3 w-5/6 rounded-full bg-muted/70" /></div>)}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[108px,1fr] gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-2">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/50 to-primary/15" />
              <div className="space-y-2"><div className="h-3 w-11/12 rounded-full bg-foreground/20" /><div className="h-3 w-full rounded-full bg-muted/70" /></div>
            </div>
            {Array.from({ length: 2 }).map((_, index) => <div key={index} className="grid grid-cols-[108px,1fr] gap-3"><div className="aspect-video rounded-xl bg-muted/65" /><div className="space-y-2"><div className="h-3 w-5/6 rounded-full bg-muted/70" /><div className="h-3 w-full rounded-full bg-muted/60" /></div></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateAdDialog() {
  const { isOpen, mode, initialStep, campaignId, onClose } = useCreateAdDialog();
  const { toast } = useToast();
  const [step, setStep] = useState<CreateAdStep>('media');
  const [form, setForm] = useState<FormState>(initialForm);
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [autoThumbUrl, setAutoThumbUrl] = useState<string | null>(null);
  const [customThumbUrl, setCustomThumbUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedOverview, setSavedOverview] = useState<StudioAdsOverview | null>(null);
  const [editingOverview, setEditingOverview] = useState<StudioAdsOverview | null>(null);
  const [walletBalancePaise, setWalletBalancePaise] = useState(0);
  const [paymentSource, setPaymentSource] = useState<'wallet' | 'new'>('new');
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('media'); setForm(initialForm); setPackages([]); setSelectedPackageId(''); setVideoError(null); setSavedOverview(null); setEditingOverview(null);
    setWalletBalancePaise(0); setPaymentSource('new');
    setVideoPreviewUrl((v) => { if (v?.startsWith('blob:')) URL.revokeObjectURL(v); return null; });
    setAutoThumbUrl((v) => { if (v?.startsWith('blob:')) URL.revokeObjectURL(v); return null; });
    setCustomThumbUrl((v) => { if (v?.startsWith('blob:')) URL.revokeObjectURL(v); return null; });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }

    const loadOverview = async () => {
      const overview = await getStudioAdsOverviewClient();
      setWalletBalancePaise(overview.walletBalancePaise);
        if (mode === 'edit') {
          const payload = campaignId ? await getStudioAdCampaignClient(campaignId).catch(() => null) : {
            campaign: overview.campaign,
            creative: overview.creative,
          };

          if (!payload?.campaign || !payload?.creative) {
            onClose();
            return;
          }

          const mergedOverview = {
            ...overview,
            campaign: payload.campaign,
            creative: payload.creative,
          };

          setEditingOverview(mergedOverview);
          setWalletBalancePaise(mergedOverview.walletBalancePaise);
          setForm({
            title: payload.creative.title,
            description: payload.creative.description,
            websiteUrl: payload.creative.websiteUrl,
            ctaLabel: payload.creative.ctaLabel,
            placement: payload.campaign.placement,
            videoFile: null,
            autoThumbnailFile: null,
            customThumbnailFile: null,
            seconds: payload.creative.videoDurationSeconds,
            width: payload.creative.videoWidth,
            height: payload.creative.videoHeight,
          });
          setSelectedPackageId(payload.campaign.packageId || '');
          setVideoPreviewUrl(payload.creative.videoPlaybackUrl || null);
          setAutoThumbUrl(payload.creative.thumbnailUrl || null);
          setCustomThumbUrl(null);
          setSavedOverview(mergedOverview);
          setStep(resolveEditableStep(mergedOverview, initialStep));
          return;
        }

        if (!overview.canCreateAd) {
          onClose();
        }
      };

    loadOverview().catch(() => null);
  }, [campaignId, initialStep, isOpen, mode, onClose, reset]);
  useEffect(() => { if (!isOpen) return; getAdPackagesClient(form.placement).then((p) => { setPackages(p.packages); setSelectedPackageId((id) => id && p.packages.some((item) => item.id === id) ? id : p.packages[0]?.id || ''); }).catch(() => setPackages([])); }, [form.placement, isOpen]);
  useEffect(() => {
    if (walletBalancePaise > 0) {
      setPaymentSource((current) => (current === 'new' ? 'wallet' : current));
    } else {
      setPaymentSource('new');
    }
  }, [walletBalancePaise]);

  const onDropVideo = useCallback(async (files: File[]) => {
    const file = files[0]; if (!file) return;
    const meta = await inspectVideoFile(file).catch(() => null);
    if (!meta) return setVideoError('We could not read this video.');
    if (meta.durationSeconds > 60) return setVideoError('Ad videos must be 60 seconds or less.');
    if (meta.isPortrait) return setVideoError('Ad videos must be landscape.');
    const thumb = await generateVideoThumbnailFile(file, { atSeconds: Math.min(Math.max(meta.durationSeconds * 0.2, 0.15), 1.4) }).catch(() => null);
    setVideoError(null);
    setVideoPreviewUrl((v) => { if (v?.startsWith('blob:')) URL.revokeObjectURL(v); return URL.createObjectURL(file); });
    setAutoThumbUrl((v) => { if (v?.startsWith('blob:')) URL.revokeObjectURL(v); return thumb ? URL.createObjectURL(thumb) : null; });
    setCustomThumbUrl((v) => { if (v?.startsWith('blob:')) URL.revokeObjectURL(v); return null; });
    setForm((current) => ({ ...current, videoFile: file, autoThumbnailFile: thumb, customThumbnailFile: null, seconds: meta.durationSeconds, width: meta.width, height: meta.height }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onDropVideo, accept: { 'video/*': [] }, multiple: false });
  const existingCreative = editingOverview?.creative || null;
  const mediaValid = Boolean(((form.videoFile && form.autoThumbnailFile) || existingCreative) && !videoError);
  const detailsValid = Boolean(form.title.trim() && form.description.trim() && form.websiteUrl.trim() && form.ctaLabel.trim());
  const pricingValid = Boolean(selectedPackageId);
  const currentStep = stepIndex(step);
  const selectedPackage = packages.find((item) => item.id === selectedPackageId) || null;
  const selectedPackageTotalPaise = selectedPackage
    ? selectedPackage.pricePaise + Math.round(selectedPackage.pricePaise * (selectedPackage.gstPercent / 100))
    : 0;
  const walletAppliedPaise =
    paymentSource === 'wallet' && selectedPackage ? Math.min(walletBalancePaise, selectedPackageTotalPaise) : 0;
  const remainingPaymentPaise = Math.max(selectedPackageTotalPaise - walletAppliedPaise, 0);
  const previewThumb = customThumbUrl || autoThumbUrl;
  const stepStates: Partial<Record<CreateAdStep, CreateAdStepState>> = {
    media: mediaValid ? (step === 'media' ? 'active' : 'complete') : videoError ? 'error' : 'pending',
    details: step === 'details' ? 'active' : currentStep > 1 && detailsValid ? 'complete' : 'pending',
    placement: step === 'placement' ? 'active' : currentStep > 2 ? 'complete' : 'pending',
    pricing: step === 'pricing' ? 'active' : step === 'published' ? 'complete' : 'pending',
  };

  const selectCustomThumbnail = (file: File | null) => {
    setForm((current) => ({ ...current, customThumbnailFile: file }));
    setCustomThumbUrl((v) => { if (v?.startsWith('blob:')) URL.revokeObjectURL(v); return file ? URL.createObjectURL(file) : null; });
  };

  const uploadAssets = async () => {
    if (!form.videoFile && !existingCreative) {
      throw new Error('AD_MEDIA_INCOMPLETE');
    }

    if (!form.videoFile && existingCreative) {
      if (form.customThumbnailFile) {
        const selectedUpload = await uploadFileToStorage({
          bucket: 'thumbnails',
          objectKey: objectKey('thumbnails', form.customThumbnailFile),
          file: form.customThumbnailFile,
        });

        return {
          videoStorageRef: existingCreative.videoStorageRef,
          thumbnailStorageRef: selectedUpload.storageRef,
          extractedThumbnailStorageRef: existingCreative.extractedThumbnailStorageRef,
          selectedThumbnailSource: 'custom' as const,
          videoMimeType: existingCreative.videoMimeType,
          thumbnailMimeType: form.customThumbnailFile.type || existingCreative.thumbnailMimeType,
        };
      }

      return {
        videoStorageRef: existingCreative.videoStorageRef,
        thumbnailStorageRef: existingCreative.thumbnailStorageRef,
        extractedThumbnailStorageRef: existingCreative.extractedThumbnailStorageRef,
        selectedThumbnailSource: existingCreative.selectedThumbnailSource,
        videoMimeType: existingCreative.videoMimeType,
        thumbnailMimeType: existingCreative.thumbnailMimeType,
      };
    }

    if (!form.videoFile || !form.autoThumbnailFile) {
      throw new Error('AD_MEDIA_INCOMPLETE');
    }

    const thumb = form.customThumbnailFile || form.autoThumbnailFile;
    const chosen = form.customThumbnailFile ? 'custom' : 'extracted';
    const [videoUpload, extractedUpload, selectedUpload] = await Promise.all([
      uploadFileToStorage({ bucket: 'videos', objectKey: objectKey('videos', form.videoFile), file: form.videoFile }),
      uploadFileToStorage({ bucket: 'thumbnails', objectKey: objectKey('thumbnails', form.autoThumbnailFile), file: form.autoThumbnailFile }),
      uploadFileToStorage({ bucket: 'thumbnails', objectKey: objectKey('thumbnails', thumb), file: thumb }),
    ]);
    return { videoStorageRef: videoUpload.storageRef, thumbnailStorageRef: selectedUpload.storageRef, extractedThumbnailStorageRef: extractedUpload.storageRef, selectedThumbnailSource: chosen as 'extracted' | 'custom', videoMimeType: form.videoFile.type || 'video/mp4', thumbnailMimeType: thumb.type || 'image/jpeg' };
  };

  const submit = async () => {
    if (!mediaValid || !detailsValid || !selectedPackage) return;
    setSubmitting(true);
    let draftCampaignId: string | null = null;
    let movedIntoPayment = false;
        let blockedCheckoutFallbackPayload:
      | {
          campaignId: string;
          title: string;
          orderId: string;
          amountPaise: number;
          currency: string;
          keyId: string;
          customer?: {
            name?: string;
            email?: string;
          };
        }
      | null = null;
    try {
      const assets = await uploadAssets();
      const payload: CreateAdDraftInput = { title: form.title.trim(), description: form.description.trim(), websiteUrl: form.websiteUrl.trim(), ctaLabel: form.ctaLabel.trim(), placement: form.placement, videoStorageRef: assets.videoStorageRef, thumbnailStorageRef: assets.thumbnailStorageRef, extractedThumbnailStorageRef: assets.extractedThumbnailStorageRef, selectedThumbnailSource: assets.selectedThumbnailSource, videoDurationSeconds: form.seconds, videoWidth: form.width, videoHeight: form.height, videoMimeType: assets.videoMimeType, thumbnailMimeType: assets.thumbnailMimeType };
      const draft = editingOverview?.campaign
        ? await updateAdDraftClient(editingOverview.campaign.id, payload)
        : await saveAdDraftClient(payload);
      if (!draft.campaign) throw new Error('AD_CAMPAIGN_SAVE_FAILED');
      draftCampaignId = draft.campaign.id;
      setEditingOverview(draft);
      setWalletBalancePaise(draft.walletBalancePaise);

      if (draft.campaign.paymentStatus === 'paid') {
        setSavedOverview(draft);
        setWalletBalancePaise(draft.walletBalancePaise);
        setStep('published');
        toast({
          title: 'Ad updated',
          description:
            draft.campaign.reviewStatus === 'pending'
              ? 'Your updated ad is still waiting for manual review. Review usually takes 2-3 days.'
              : 'Your ad campaign details were updated.',
        });
      } else {
        const order = await createAdOrderClient(draft.campaign.id, selectedPackage.id, {
          useWalletBalance: paymentSource === 'wallet',
        });
        movedIntoPayment = true;
        if (order.payment.kind === 'wallet' && order.overview) {
          setSavedOverview(order.overview);
          setWalletBalancePaise(order.overview.walletBalancePaise);
          if (order.payment.walletCreditPaise > 0) {
            emitWalletSync({
              type: 'transaction',
              transaction: {
                id: `local-wallet-${order.orderId}`,
                type: 'debit',
                amountPaise: order.payment.walletCreditPaise,
                balanceAfterPaise: order.overview.walletBalancePaise,
                referenceType: 'ad_order_wallet_debit',
                referenceId: order.orderId,
                relatedCampaignId: draft.campaign.id,
                notes: 'Applied wallet balance to ad campaign payment.',
                createdAt: new Date().toISOString(),
              },
              balancePaise: order.overview.walletBalancePaise,
              totalDebitedDeltaPaise: order.payment.walletCreditPaise,
            });
          }
          setStep('published');
          toast({
            title: 'Paid from wallet',
            description:
              order.overview.campaign?.reviewStatus === 'pending'
                ? 'Your wallet balance covered this ad and it is now waiting for manual review. Review usually takes 2-3 days.'
                : 'Your wallet balance covered this ad campaign.',
          });
          return;
        }
        if (!order.razorpay) {
          throw new Error('RAZORPAY_ORDER_MISSING');
        }
        blockedCheckoutFallbackPayload = {
          campaignId: draft.campaign.id,
          title: form.title.trim(),
          orderId: order.razorpay.orderId,
          amountPaise: order.razorpay.amountPaise,
          currency: order.razorpay.currency,
          keyId: order.razorpay.keyId,
          customer: order.razorpay.customer,
        };
        const paid = await completeAdCheckoutClient({ campaignId: draft.campaign.id, title: form.title.trim(), orderId: order.razorpay.orderId, amountPaise: order.razorpay.amountPaise, currency: order.razorpay.currency, keyId: order.razorpay.keyId, customer: order.razorpay.customer });
        if (paid.kind === 'redirected') {
          onClose();
          return;
        }
        setSavedOverview(paid.overview);
        if (order.payment.walletCreditPaise > 0) {
          emitWalletSync({
            type: 'transaction',
            transaction: {
              id: `local-wallet-${order.orderId}`,
              type: 'debit',
              amountPaise: order.payment.walletCreditPaise,
              balanceAfterPaise: paid.overview.walletBalancePaise,
              referenceType: 'ad_order_wallet_debit',
              referenceId: order.orderId,
              relatedCampaignId: draft.campaign.id,
              notes: 'Applied wallet balance to ad campaign payment.',
              createdAt: new Date().toISOString(),
            },
            balancePaise: paid.overview.walletBalancePaise,
            totalDebitedDeltaPaise: order.payment.walletCreditPaise,
          });
        }
        setStep('published');
        toast({
          title: 'Payment received',
          description:
            paid.overview.campaign?.reviewStatus === 'pending'
              ? 'Your ad is waiting for review. Review usually takes 2-3 days.'
              : 'Your ad campaign is live.',
        });
      }
    } catch (error) {
      const paymentError = getReadableRazorpayError(error);
      const message = paymentError.code;
      if (message === 'RAZORPAY_CHECKOUT_BLOCKED' && blockedCheckoutFallbackPayload) {
        onClose();
        startAdCheckoutRedirectFallback(blockedCheckoutFallbackPayload);
        return;
      }
      if (draftCampaignId && movedIntoPayment) {
        window.dispatchEvent(new Event(ADS_SYNC_EVENT));
        await getStudioAdsOverviewClient().then(setSavedOverview).catch(() => null);
        onClose();
        toast({
          title:
            message === 'RAZORPAY_CHECKOUT_DISMISSED' || message === 'RAZORPAY_CHECKOUT_BLOCKED'
              ? 'Ad saved as pending payment'
              : 'Ad saved with payment pending',
          description:
            message === 'RAZORPAY_CHECKOUT_DISMISSED'
              ? 'Continue payment from Studio Ads whenever you are ready.'
              : message === 'RAZORPAY_CHECKOUT_BLOCKED'
                ? 'The browser blocked Razorpay checkout. Allow it, then continue payment again from Studio Ads.'
                : 'Open Studio Ads to continue payment or check the campaign status.',
        });
      } else {
        toast({ title: paymentError.title || 'Ad creation failed', description: paymentError.description, variant: 'destructive' });
      }
    } finally { setSubmitting(false); }
  };

  const previewTitle = useMemo(() => !form.title.trim() ? 'Your ad title will appear here.' : form.title.trim(), [form.title]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="left-1/2 top-4 grid h-[min(860px,calc(100vh-2rem))] w-[min(980px,calc(100vw-3rem))] max-w-none -translate-x-1/2 translate-y-0 grid-cols-[minmax(0,1fr)_320px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-visible border-none bg-transparent p-0 shadow-none">
        {step !== 'published' ? (
          <aside className="absolute left-[-204px] top-0 hidden w-[180px] rounded-[28px] border border-border/70 bg-background/95 p-4 xl:block">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Campaign steps</p>
            <CreateAdDialogStepper currentStep={step} setStep={setStep} furthestStepIndex={currentStep} stepStates={stepStates} orientation="vertical" />
          </aside>
        ) : null}
        <DialogHeader className="col-span-2 rounded-t-[32px] border border-border/70 border-b-0 bg-background p-4">
          <DialogTitle className="text-2xl">{mode === 'edit' ? 'Edit ad campaign' : 'Create ad campaign'}</DialogTitle>
          {step !== 'published' ? (
            <div className="mt-3 xl:hidden">
              <CreateAdDialogStepper currentStep={step} setStep={setStep} furthestStepIndex={currentStep} stepStates={stepStates} />
            </div>
          ) : null}
        </DialogHeader>
        <ScrollArea className="min-h-0 border-x border-border/70 bg-background">
          <div className="p-6">
            {step === 'media' ? (
              <div className="space-y-6">
                <div
                  {...getRootProps()}
                  className={cn(
                    'rounded-[28px] border border-dashed border-border/70 bg-secondary/10 p-8 text-center transition-colors',
                    isDragActive && 'border-primary bg-primary/5'
                  )}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-5 text-2xl font-semibold">Drop a landscape ad video here</p>
                  <p className="mt-2 text-sm text-muted-foreground">MP4, MOV, or WEBM. Max length: 60 seconds.</p>
                  <Button type="button" className="mt-6 rounded-full">Select ad video</Button>
                </div>
                {videoError ? <p className="text-sm text-rose-500">{videoError}</p> : null}
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Video preview</Label>
                      {videoPreviewUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setEditingOverview((current) => current ? { ...current, creative: null } : null);
                            setForm((c) => ({ ...c, videoFile: null, autoThumbnailFile: null, customThumbnailFile: null, seconds: 0, width: 0, height: 0 }));
                            setVideoPreviewUrl(null);
                            setAutoThumbUrl(null);
                            setCustomThumbUrl(null);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Choose another
                        </Button>
                      ) : null}
                    </div>
                    <div className="overflow-hidden rounded-[24px] border border-border/70 bg-secondary/15">
                      {videoPreviewUrl ? (
                        <video src={videoPreviewUrl} controls playsInline className="aspect-video w-full object-cover" />
                      ) : (
                        <div className="grid aspect-video place-items-center px-6 text-center text-sm text-muted-foreground">
                          Upload a video to preview the ad.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Thumbnail</Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" className="rounded-full" onClick={() => thumbInputRef.current?.click()}>
                          <ImagePlus className="mr-2 h-4 w-4" />
                          Custom thumbnail
                        </Button>
                        {form.customThumbnailFile ? (
                          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => selectCustomThumbnail(null)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => selectCustomThumbnail(e.target.files?.[0] || null)} />
                    </div>
                    <div className="overflow-hidden rounded-[24px] border border-border/70 bg-secondary/15">
                      {previewThumb ? (
                        <Image src={previewThumb} alt="Ad thumbnail preview" width={1280} height={720} className="aspect-video w-full object-cover" unoptimized />
                      ) : (
                        <div className="grid aspect-video place-items-center px-6 text-center text-sm text-muted-foreground">
                          Default thumbnail appears here after upload.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {step === 'details' ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="ad-title">Title</Label>
                  <Input id="ad-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ad-description">Description</Label>
                  <Textarea id="ad-description" className="min-h-32" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ad-website">Website</Label>
                    <Input id="ad-website" value={form.websiteUrl} onChange={(e) => setForm((c) => ({ ...c, websiteUrl: e.target.value }))} placeholder="https://example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ad-cta">CTA label</Label>
                    <Input id="ad-cta" value={form.ctaLabel} onChange={(e) => setForm((c) => ({ ...c, ctaLabel: e.target.value }))} placeholder="Start now" />
                  </div>
                </div>
              </div>
            ) : null}
            {step === 'placement' ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  {placements.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, placement: option.value }))}
                      className={cn(
                        'rounded-[28px] border p-5 text-left transition-colors',
                        form.placement === option.value ? 'border-primary bg-primary/5' : 'border-border/70 bg-secondary/20 hover:bg-secondary/40'
                      )}
                    >
                      <p className="font-semibold">{option.label}</p>
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <PlacementPreview title="Home feed" description="Sponsored card shown inside the main home feed." active={form.placement === 'home' || form.placement === 'both'} type="home" />
                  <PlacementPreview title="Search results" description="Sponsored result shown inline with videos." active={form.placement === 'search' || form.placement === 'both'} type="search" />
                </div>
              </div>
            ) : null}
            {step === 'pricing' ? (
              <div className="space-y-5">
                {packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading packages...</p>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      {packages.map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPackageId(pkg.id)}
                          className={cn(
                            'rounded-[28px] border p-5 text-left transition-colors',
                            selectedPackageId === pkg.id ? 'border-primary bg-primary/5' : 'border-border/70 bg-secondary/20 hover:bg-secondary/40'
                          )}
                        >
                          <p className="font-semibold">{pkg.name}</p>
                          <p className="mt-2 text-2xl font-black">{priceLabel(pkg)}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{pkg.durationDays} days · {pkg.impressionCap.toLocaleString('en-IN')} max impressions</p>
                        </button>
                      ))}
                    </div>
                    {walletBalancePaise > 0 && selectedPackage ? (
                      <div className="rounded-[28px] border border-border/70 bg-secondary/15 p-5">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-primary" />
                          <p className="font-semibold">Choose how to pay</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Wallet balance available: <span className="font-semibold text-foreground">{formatCurrencyFromPaise(walletBalancePaise)}</span>
                        </p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setPaymentSource('wallet')}
                            className={cn(
                              'rounded-[24px] border p-4 text-left transition-colors',
                              paymentSource === 'wallet' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background hover:bg-secondary/10'
                            )}
                          >
                            <p className="font-semibold">Use wallet money</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {walletAppliedPaise >= selectedPackageTotalPaise
                                ? `This ad will be fully covered by your wallet.`
                                : `${formatCurrencyFromPaise(walletAppliedPaise)} will come from wallet and ${formatCurrencyFromPaise(remainingPaymentPaise)} will be paid now.`}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentSource('new')}
                            className={cn(
                              'rounded-[24px] border p-4 text-left transition-colors',
                              paymentSource === 'new' ? 'border-primary bg-primary/5' : 'border-border/70 bg-background hover:bg-secondary/10'
                            )}
                          >
                            <p className="font-semibold">Pay new amount</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Pay the full {formatCurrencyFromPaise(selectedPackageTotalPaise)} now and keep your wallet balance for later.
                            </p>
                          </button>
                        </div>
                        <p className="mt-4 text-xs leading-6 text-muted-foreground">
                          Review usually takes 2-3 days after payment.
                        </p>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">
                          Ad payments are generally final. If Waslmedia rejects the campaign before delivery or cannot run it for a platform-side reason, the default outcome is Waslmedia Wallet credit for a future eligible purchase.
                        </p>
                      </div>
                    ) : selectedPackage ? (
                      <div className="rounded-[28px] border border-border/70 bg-secondary/15 p-5 text-sm text-muted-foreground">
                        <p>Review usually takes 2-3 days after payment.</p>
                        <p className="mt-2">
                          Ad payments are generally final. If Waslmedia rejects the campaign before delivery or cannot run it for a platform-side reason, the default outcome is Waslmedia Wallet credit for a future eligible purchase.
                        </p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
            {step === 'published' ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 text-emerald-500">
                  <CheckCircle2 className="mt-0.5 h-7 w-7" />
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Campaign submitted</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {savedOverview?.campaign?.reviewStatus === 'pending'
                        ? 'Payment is verified and your ad is waiting for manual review. Review usually takes 2-3 days.'
                        : 'Your ad campaign is active.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </ScrollArea>
        <div className="border-y border-r border-border/70 bg-secondary/10 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Live preview</p>
          <div className="mt-4 overflow-hidden rounded-[24px] border border-border/70 bg-background">
            <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_30%),linear-gradient(135deg,#421f7a_0%,#6d28d9_52%,#7c3aed_100%)]">
              {previewThumb ? <Image src={previewThumb} alt="Ad thumbnail" width={1280} height={720} className="absolute inset-0 h-full w-full object-cover opacity-75" unoptimized /> : null}
              <div className="absolute inset-0 bg-black/15" />
            </div>
            <div className="space-y-2 p-4">
              <p className="line-clamp-2 text-base font-semibold">{previewTitle}</p>
              <p className="line-clamp-3 text-sm text-muted-foreground">{form.description || 'Your ad description will appear here.'}</p>
              <p className="truncate text-sm text-muted-foreground"><span className="font-medium text-foreground">Sponsored</span> · {safeDomain(form.websiteUrl)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" className="rounded-full truncate">Watch</Button>
                <Button className="rounded-full truncate">{form.ctaLabel || 'Start now'}</Button>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3 rounded-[24px] border border-border/70 bg-background p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3"><UploadCloud className="mt-0.5 h-4 w-4 shrink-0" />Video rules: landscape, under 60 seconds.</div>
            <div className="flex items-start gap-3"><ImagePlus className="mt-0.5 h-4 w-4 shrink-0" />Placement: <span className="font-semibold text-foreground">{placements.find((item) => item.value === form.placement)?.label}</span></div>
            {selectedPackage ? <div className="flex items-start gap-3"><Wallet className="mt-0.5 h-4 w-4 shrink-0" />Budget: <span className="font-semibold text-foreground">{priceLabel(selectedPackage)}</span></div> : null}
            {selectedPackage && walletBalancePaise > 0 ? (
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                {paymentSource === 'wallet'
                  ? `Wallet pays ${formatCurrencyFromPaise(walletAppliedPaise)}${remainingPaymentPaise > 0 ? ` · Remaining ${formatCurrencyFromPaise(remainingPaymentPaise)}` : ' · No new payment needed'}`
                  : `Wallet available: ${formatCurrencyFromPaise(walletBalancePaise)} · Paying new amount`}
              </div>
            ) : null}
            <div className="flex items-start gap-3"><CalendarRange className="mt-0.5 h-4 w-4 shrink-0" />Review usually takes 2-3 days after payment.</div>
            <div className="flex items-start gap-3"><Wallet className="mt-0.5 h-4 w-4 shrink-0" />Paid ads are generally final. If Waslmedia cannot run the campaign before delivery, the default remedy is Waslmedia Wallet credit.</div>
          </div>
        </div>
        <DialogFooter className="col-span-2 rounded-b-[32px] border border-border/70 border-t-0 bg-background p-4">
          <div className="mr-auto text-sm text-muted-foreground">{step === 'published' ? 'Campaign flow complete.' : step === 'pricing' ? 'Choose a package and continue to payment.' : 'Complete the current step to continue.'}</div>
          <div className="flex items-center gap-2">
            {step !== 'media' && step !== 'published' ? <Button variant="secondary" className="rounded-full" onClick={() => step === 'details' ? setStep('media') : step === 'placement' ? setStep('details') : setStep('placement')} disabled={submitting}>Back</Button> : null}
            {step === 'published' ? <Button className="rounded-full" onClick={onClose}>Close</Button> : step === 'pricing' ? <Button className="rounded-full" onClick={submit} disabled={!mediaValid || !detailsValid || !pricingValid || submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{paymentSource === 'wallet' && remainingPaymentPaise <= 0 ? 'Use wallet and submit' : paymentSource === 'wallet' && remainingPaymentPaise > 0 ? `Pay ${formatCurrencyFromPaise(remainingPaymentPaise)}` : 'Pay and submit'}</Button> : <Button className="rounded-full" disabled={(step === 'media' && !mediaValid) || (step === 'details' && !detailsValid) || submitting} onClick={() => step === 'media' ? setStep('details') : step === 'details' ? setStep('placement') : setStep('pricing')}>Next</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
