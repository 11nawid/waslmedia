'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Button } from './ui/button';
import { UploadCloud, Copy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadSelectStepProps = {
  getRootProps: () => Record<string, unknown>;
  getInputProps: () => Record<string, unknown>;
  isDragActive: boolean;
  disabled?: boolean;
  quotaSummary?: ReactNode;
};

type UploadPublishedStepProps = {
  message: string;
  videoId: string | null;
  onCopyLink: () => void;
  onClose: () => void;
};

export function UploadSelectStep({
  getRootProps,
  getInputProps,
  isDragActive,
  disabled = false,
  quotaSummary,
}: UploadSelectStepProps) {
  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-7 text-center">
        <div
          {...getRootProps()}
          className={cn(
            'flex h-full w-full flex-col items-center justify-center rounded-[32px] border border-dashed px-6 py-10 transition-colors',
            disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border/80 bg-card/40 hover:border-primary/40 hover:bg-card/55'
          )}
        >
          <input {...getInputProps()} />
          <div className="mb-8 rounded-full border border-border/70 bg-secondary/55 p-7 shadow-sm">
            <UploadCloud className="h-20 w-20 text-muted-foreground" />
          </div>
          <p className="mb-2 text-2xl font-semibold tracking-tight">Upload a video or Short</p>
          <p className="mb-8 max-w-xl text-sm text-muted-foreground sm:text-base">
            Drop a file here or choose one from your device. We&apos;ll detect whether it should go
            through the Shorts flow or the regular video flow automatically.
          </p>
          {quotaSummary ? <div className="mb-6 max-w-xl text-sm">{quotaSummary}</div> : null}
          <Button variant="primary" className="pointer-events-none rounded-full px-6">
            {disabled ? 'Daily limit reached' : 'Select file'}
          </Button>
        </div>
      </div>
      <div className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        By submitting content to Waslmedia, you acknowledge that you agree to the Terms of Service
        and Community Guidelines.
      </div>
    </>
  );
}

export function UploadPublishedStep({
  message,
  videoId,
  onCopyLink,
  onClose,
}: UploadPublishedStepProps) {
  const shareUrl =
    typeof window !== 'undefined' && videoId ? `${window.location.origin}/watch/${videoId}` : '';

  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center text-center p-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <CheckCircle className="w-24 h-24 text-primary mb-6" />
      </motion.div>
      <h2 className="text-2xl font-semibold mb-2">{message}</h2>
      <p className="text-muted-foreground mb-8">Share a link with your friends, family and fans.</p>
      <div className="bg-secondary p-3 rounded-md text-sm flex items-center gap-4 w-full max-w-md">
        <Link href={shareUrl || '#'} className="text-accent break-all flex-1" target="_blank">
          {shareUrl || 'Link will appear after upload'}
        </Link>
        <Button variant="ghost" size="icon" onClick={onCopyLink} disabled={!shareUrl}>
          <Copy className="w-5 h-5" />
        </Button>
      </div>
      <Button onClick={onClose} className="mt-8">
        Close
      </Button>
    </motion.div>
  );
}
