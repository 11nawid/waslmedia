'use client';

import { ChangeEvent, useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { AlertCircle, Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { uploadFileToStorage } from '@/lib/storage/client';

const MAX_LENGTH = 5000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 - 1;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FeedbackFormProps = {
  title: string;
  description: string;
  submitLabel?: string;
  className?: string;
};

export function FeedbackForm({
  title,
  description,
  submitLabel = 'Send feedback',
  className,
}: FeedbackFormProps) {
  const pathname = usePathname() || '';
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const remaining = MAX_LENGTH - message.length;

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    if (!nextFile) {
      setAttachment(null);
      return;
    }

    if (nextFile.size >= MAX_ATTACHMENT_BYTES + 1) {
      toast({
        title: 'File is too large',
        description: 'Attach a file smaller than 10 MB.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    setAttachment(nextFile);
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      toast({
        title: 'Please enter your feedback before submitting.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      let uploadedAttachment:
        | {
            bucket: string;
            objectKey: string;
            storageRef: string;
            name: string;
            contentType: string;
            sizeBytes: number;
          }
        | undefined;

      if (attachment) {
        const uploaded = await uploadFileToStorage({
          bucket: 'feedback',
          objectKey: attachment.name,
          file: attachment,
        });
        uploadedAttachment = {
          ...uploaded,
          name: attachment.name,
          contentType: attachment.type || 'application/octet-stream',
          sizeBytes: attachment.size,
        };
      }

      const response = await fetch('/api/studio/feedback', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: pathname || '/',
          message,
          attachment: uploadedAttachment,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const description =
          payload.error === 'FEEDBACK_ATTACHMENT_TOO_LARGE'
            ? 'Attach a file smaller than 10 MB.'
            : payload.error === 'INVALID_FEEDBACK_ATTACHMENT'
              ? 'The selected attachment could not be processed.'
              : payload.error || 'Please try again.';

        toast({
          title: 'Feedback could not be submitted',
          description,
          variant: 'destructive',
        });
        return;
      }

      setMessage('');
      clearAttachment();
      toast({
        title: 'Feedback submitted',
        description: 'Thanks for helping improve Waslmedia.',
      });
    });
  };

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[30px] border border-border/80 bg-gradient-to-br from-background via-background to-secondary/20 shadow-[0_24px_90px_-60px_rgba(15,23,42,0.45)]',
        className
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-0">
        <div className="border-b border-border/70 px-6 py-6 md:px-8">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
            <Send className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-5 px-6 py-6 md:px-8">
          <div className="rounded-[26px] border border-border/70 bg-background/80 p-3 shadow-sm">
            <Textarea
              rows={10}
              maxLength={MAX_LENGTH}
              placeholder="Tell us what happened, where it happened, and what you expected instead."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[220px] resize-y rounded-[20px] border-0 bg-transparent px-3 py-3 text-sm leading-7 shadow-none outline-none ring-0 focus-visible:ring-0"
            />
          </div>

          <div className="rounded-[24px] border border-dashed border-border/80 bg-secondary/20 p-4">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleAttachmentChange}
            />
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Optional attachment</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Add one support file smaller than 10 MB.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Choose file
              </Button>
            </div>

            {attachment ? (
              <div className="mt-4 flex items-start justify-between gap-3 rounded-[18px] border border-border/70 bg-background px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-full"
                  onClick={clearAttachment}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-[18px] bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                PNG, JPG, PDF, ZIP, TXT, and similar files are allowed if they stay under 10 MB.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="text-xs text-muted-foreground">
            <span className={cn(remaining < 120 ? 'text-amber-600 dark:text-amber-400' : '')}>
              {remaining}
            </span>{' '}
            characters left
          </div>
          <Button
            type="submit"
            disabled={isPending || !message.trim()}
            className="rounded-full px-6"
          >
            {isPending ? 'Submitting...' : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
