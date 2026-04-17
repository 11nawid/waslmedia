

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useUploadDialog } from '@/hooks/use-upload-dialog';
import { FileVideo, Image as ImageIcon, Sparkles, TestTube2, Info, X, Loader2, Upload, Play } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { Video } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { getUploadDefaults } from '@/lib/studio/client';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { uploadFileToStorage } from '@/lib/storage/client';
import { sanitizeFileName } from '@/lib/storage/shared';
import { apiSend } from '@/lib/api/client';
import { UploadDialogStepper, uploadCategories, type UploadStep } from './upload-dialog-config';
import {
  generateVideoThumbnailFile,
  getPublishMessage,
  getUploadStatusMessage,
  getVideoFileDuration,
  inspectVideoFile,
} from './upload-dialog-helpers';
import { videoDetailsSchema, type VideoDetailsSchema } from './upload-dialog-schema';
import { UploadPublishedStep, UploadSelectStep } from './upload-dialog-screens';
import { useShortsUploadDialog } from '@/hooks/use-shorts-upload-dialog';
import { useProgressRouter } from '@/hooks/use-progress-router';
import {
  getVideoUploadConstraintsClient,
  syncVideoUploadConstraints,
  UPLOAD_CONSTRAINTS_SYNC_EVENT,
} from '@/lib/video-upload/client';
import { buildUploadConstraintSummary, getVideoUploadErrorMessage } from '@/lib/video-upload/ui';
import {
  LONG_VIDEO_MAX_DURATION_SECONDS_EXCLUSIVE,
  type VideoUploadConstraints,
} from '@/lib/video-upload/rules';

function renderConstraintSummary(
  summary: VideoUploadConstraints['longVideos'] | null,
  options?: { muted?: boolean }
) {
  if (!summary) {
    return null;
  }

  const labels = buildUploadConstraintSummary(summary, 'videos');
  return (
    <div className={cn('rounded-2xl border border-border/70 bg-secondary/30 p-4 text-left', options?.muted && 'bg-background/60')}>
      <p className="text-sm font-semibold text-foreground">{labels.remainingLabel}</p>
      <p className="mt-1 text-sm text-muted-foreground">Long videos must be under 15 minutes.</p>
      {labels.nextAvailableLabel ? <p className="mt-1 text-xs text-muted-foreground">{labels.nextAvailableLabel}</p> : null}
    </div>
  );
}

export function UploadDialog() {
  const router = useProgressRouter();
  const { user } = useAuth();
  const { isOpen, onClose, videoToEdit, pendingFile } = useUploadDialog();
  const { onOpen: onOpenShortUpload } = useShortsUploadDialog();
  const { toast } = useToast();
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'pending' | 'uploading' | 'processing' | 'success' | 'error'>('pending');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [generatedThumbnailFile, setGeneratedThumbnailFile] = useState<File | null>(null);
  const [generatedThumbnailPreview, setGeneratedThumbnailPreview] = useState<string | null>(null);
  const [customThumbnailPreview, setCustomThumbnailPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [uploadConstraints, setUploadConstraints] = useState<VideoUploadConstraints | null>(null);
  const [constraintsLoading, setConstraintsLoading] = useState(false);


  const { control, register, handleSubmit, formState: { errors }, setValue, watch, trigger, reset } = useForm<VideoDetailsSchema>({
    resolver: zodResolver(videoDetailsSchema),
    defaultValues: {
        title: '',
        description: '',
        audience: 'notMadeForKids',
        tags: [],
        language: 'None',
        category: 'People & Blogs',
        commentsEnabled: true,
        showLikes: true,
    }
  });

  const visibility = watch('visibility');
  const tags = watch('tags') || [];
  const titleValue = watch('title');
  const longVideoConstraints = uploadConstraints?.longVideos || null;
  const isLongUploadBlocked = Boolean(longVideoConstraints && longVideoConstraints.remaining <= 0);

  const refreshUploadConstraints = useCallback(async () => {
    if (!user) {
      setUploadConstraints(null);
      return null;
    }

    setConstraintsLoading(true);
    try {
      const constraints = await getVideoUploadConstraintsClient();
      setUploadConstraints(constraints);
      return constraints;
    } catch (error) {
      console.error('Failed to load upload constraints', error);
      return null;
    } finally {
      setConstraintsLoading(false);
    }
  }, [user]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === ',' && tagInput.trim()) {
          e.preventDefault();
          const newTag = tagInput.trim().replace(/,$/, '');
          if (newTag && !tags.includes(newTag)) {
              setValue('tags', [...tags, newTag]);
          }
          setTagInput('');
      }
  }

  const handleRemoveTag = (tagToRemove: string) => {
      setValue('tags', tags.filter(tag => tag !== tagToRemove));
  }

  const prepareSelectedVideo = useCallback(async (selectedFile: File, options?: { allowShortRedirect?: boolean }) => {
    if (!user) {
      return;
    }

    const metadata = await inspectVideoFile(selectedFile).catch(() => null);
    const allowShortRedirect = options?.allowShortRedirect ?? true;

    if (allowShortRedirect && !videoToEdit && metadata?.isShortCandidate) {
      onClose();
      onOpenShortUpload(undefined, selectedFile);
      return;
    }

    if (metadata && metadata.durationSeconds >= LONG_VIDEO_MAX_DURATION_SECONDS_EXCLUSIVE) {
      toast({
        title: 'Video too long',
        description: 'Long videos must be under 15 minutes.',
        variant: 'destructive',
      });
      return;
    }

    if (longVideoConstraints?.remaining === 0) {
      const labels = buildUploadConstraintSummary(longVideoConstraints, 'videos');
      toast({
        title: 'Daily upload limit reached',
        description: labels.nextAvailableLabel || labels.remainingLabel,
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    const previewUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return previewUrl;
    });
    const autoThumbnailFile = await generateVideoThumbnailFile(selectedFile).catch(() => null);
    if (autoThumbnailFile) {
      setGeneratedThumbnailFile(autoThumbnailFile);
      setGeneratedThumbnailPreview((current) => {
        if (current?.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(autoThumbnailFile);
      });
    } else {
      setGeneratedThumbnailFile(null);
      setGeneratedThumbnailPreview(null);
    }
    setCustomThumbnailPreview(null);
    setValue('thumbnail', undefined);

    const defaults = await getUploadDefaults();
    if (defaults) {
      const defaultTags = defaults.tags ? defaults.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      reset({
        title: selectedFile.name.replace(/\.[^/.]+$/, ""),
        description: defaults.description || '',
        category: defaults.category || 'People & Blogs',
        tags: defaultTags,
        audience: 'notMadeForKids',
        language: 'None',
        commentsEnabled: true,
        showLikes: true,
      });
    } else {
      setValue('title', selectedFile.name.replace(/\.[^/.]+$/, ""));
    }

    setStep('details');
  }, [setValue, user, reset, onClose, onOpenShortUpload, toast, videoToEdit, longVideoConstraints]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await prepareSelectedVideo(acceptedFiles[0]);
    }
  }, [prepareSelectedVideo]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {'video/*':[]},
    multiple: false,
    disabled: isLongUploadBlocked,
  });

  const resetState = useCallback(() => {
    setFile(null);
    setUploadProgress(0);
    setStep('select');
    setUploadStatus('pending');
    setVideoUrl(null);
    if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(null);
    setVideoId(null);
    setThumbnailUrl(null);
    setGeneratedThumbnailFile(null);
    if (generatedThumbnailPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(generatedThumbnailPreview);
    }
    if (customThumbnailPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(customThumbnailPreview);
    }
    setGeneratedThumbnailPreview(null);
    setCustomThumbnailPreview(null);
    setIsEditing(false);
    setTagInput('');
    reset({
        title: '',
        description: '',
        audience: 'notMadeForKids',
        tags: [],
        language: 'None',
        category: 'People & Blogs',
        commentsEnabled: true,
        showLikes: true,
    });
  }, [customThumbnailPreview, generatedThumbnailPreview, localPreviewUrl, reset, setValue]);


  const handleClose = () => {
    if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
        if (confirm("You have an upload in progress. Are you sure you want to cancel?")) {
            onClose();
        }
    } else {
        onClose();
    }
  }
  
  useEffect(() => {
    if (!isOpen) {
        resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen || isEditing) {
      return;
    }

    void refreshUploadConstraints();
  }, [isEditing, isOpen, refreshUploadConstraints]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleSync = () => {
      void refreshUploadConstraints();
    };

    window.addEventListener(UPLOAD_CONSTRAINTS_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(UPLOAD_CONSTRAINTS_SYNC_EVENT, handleSync);
  }, [isOpen, refreshUploadConstraints]);

  useEffect(() => {
    if (!isOpen || videoToEdit || file || !pendingFile) {
      return;
    }

    prepareSelectedVideo(pendingFile, { allowShortRedirect: false }).catch((error) => {
      console.error('Failed to prepare pending video upload:', error);
      toast({
        title: 'Video could not be loaded',
        description: 'Please try another file.',
        variant: 'destructive',
      });
      onClose();
    });
  }, [file, isOpen, onClose, pendingFile, prepareSelectedVideo, toast, videoToEdit]);

  const handleSaveDetails = async (data: VideoDetailsSchema) => {
    if (!videoId || !user) return;
    try {
        const updateData: any = {
            title: data.title,
            description: data.description,
            visibility: data.visibility,
            audience: data.audience,
            tags: data.tags,
            language: data.language,
            category: data.category,
            commentsEnabled: data.commentsEnabled,
            showLikes: data.showLikes,
        };
        
        let finalThumbnailUrl = thumbnailUrl;
        if(data.thumbnail){
            const thumbnailFile = data.thumbnail;
            const thumbnailPath = `${user.uid}/${videoId}/${Date.now()}_${sanitizeFileName(thumbnailFile.name)}`;
            const uploadResult = await uploadFileToStorage({
                bucket: 'thumbnails',
                objectKey: thumbnailPath,
                file: thumbnailFile,
            });
            finalThumbnailUrl = uploadResult.storageRef;
        }

        if (finalThumbnailUrl) {
            updateData.thumbnailUrl = finalThumbnailUrl;
            setThumbnailUrl(finalThumbnailUrl);
        }

        await apiSend(`/api/videos/${videoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });
    } catch(error) {
        console.error("Failed to update details", error);
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return;

    const latestConstraints = await refreshUploadConstraints();
    if (latestConstraints?.longVideos.remaining === 0) {
      const labels = buildUploadConstraintSummary(latestConstraints.longVideos, 'videos');
      setUploadStatus('error');
      toast({
        title: 'Daily upload limit reached',
        description: labels.nextAvailableLabel || labels.remainingLabel,
        variant: 'destructive',
      });
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);

    const extension = file.name.split('.').pop() || 'mp4';
    const filePath = `${user.uid}/${crypto.randomUUID()}.${sanitizeFileName(extension)}`;


      try {
        const duration = await getVideoFileDuration(file);
        const thumbnailFile = watch('thumbnail') || generatedThumbnailFile || (await generateVideoThumbnailFile(file).catch(() => null));

        const uploadResult = await uploadFileToStorage({
            bucket: 'videos',
            objectKey: filePath,
            file,
            mediaKind: 'long',
        });
        let initialThumbnailUrl = '';
        if (thumbnailFile) {
          const thumbnailPath = `${user.uid}/${crypto.randomUUID()}_${sanitizeFileName(thumbnailFile.name)}`;
          const thumbnailUpload = await uploadFileToStorage({
            bucket: 'thumbnails',
            objectKey: thumbnailPath,
            file: thumbnailFile,
          });
          initialThumbnailUrl = thumbnailUpload.storageRef;
          setThumbnailUrl(initialThumbnailUrl);
        }
        setUploadStatus('processing');
        setVideoUrl(localPreviewUrl || null);
        
        const created = await apiSend<{ video: Video }>('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: watch('title'),
                description: watch('description'),
                visibility: watch('visibility'),
                audience: watch('audience'),
                tags: watch('tags'),
                language: watch('language'),
                category: watch('category'),
                commentsEnabled: watch('commentsEnabled'),
                showLikes: watch('showLikes'),
                thumbnailUrl: initialThumbnailUrl,
                sourceBucket: uploadResult.bucket,
                sourceObjectKey: uploadResult.objectKey,
                duration,
            }),
        });
        setVideoId(created.video.id);
        syncVideoUploadConstraints();
        void refreshUploadConstraints();
        
        setUploadStatus('success');

    } catch(error: any) {
        console.error("Upload or save failed", error);
        setUploadStatus('error');
         void refreshUploadConstraints();
         toast({
            title: 'Upload Failed',
            description: getVideoUploadErrorMessage(error.message, { kind: 'long' }),
            variant: 'destructive',
        });
    }
  }

  const handlePublish = async () => {
      const isValid = await trigger();
      if (!isValid && !isEditing) return;

      const data = watch();
      await handleSaveDetails(data);

      if(videoId){
          setStep('published');
          if (isEditing) {
            router.refresh();
          } else {
            router.push('/studio/upload');
          }
      }
  }

  const handleNext = async () => {
      if (step === 'details') {
        const isValid = await trigger(['title']);
        if (!isValid && !isEditing) return;
      }

      const data = watch();
      await handleSaveDetails(data);

      const newStep = step === 'details' ? 'elements' : step === 'elements' ? 'checks' : 'visibility';
      setStep(newStep as UploadStep);
  }

  const handleBack = () => {
       const newStep = step === 'visibility' ? 'checks' : step === 'checks' ? 'elements' : 'details';
       setStep(newStep as UploadStep);
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setValue('thumbnail', file, { shouldValidate: true });
        setCustomThumbnailPreview((current) => {
          if (current?.startsWith('blob:')) {
            URL.revokeObjectURL(current);
          }
          return URL.createObjectURL(file);
        });
    }
  }

  const togglePlay = () => {
      if(videoRef.current) {
          if(videoRef.current.paused) {
              videoRef.current.play();
          } else {
              videoRef.current.pause();
          }
      }
  }

  const copyLink = () => {
    if(videoId) {
        navigator.clipboard.writeText(`${window.location.origin}/watch/${videoId}`);
        toast({ title: 'Link copied!' });
    }
  }

  useEffect(() => {
    if(videoToEdit && isOpen) {
        setIsEditing(true);
        setVideoId(videoToEdit.id);
        reset({
            title: videoToEdit.title,
            description: videoToEdit.description,
            visibility: videoToEdit.visibility,
            audience: videoToEdit.audience || 'notMadeForKids',
            tags: videoToEdit.tags || [],
            language: videoToEdit.language || 'None',
            category: videoToEdit.category || 'People & Blogs',
            commentsEnabled: videoToEdit.commentsEnabled ?? true,
            showLikes: videoToEdit.showLikes ?? true,
        });
        setThumbnailUrl(videoToEdit.thumbnailUrl);
        setGeneratedThumbnailFile(null);
        setGeneratedThumbnailPreview(videoToEdit.thumbnailUrl || null);
        setCustomThumbnailPreview(null);
        setVideoUrl(videoToEdit.videoUrl || null);
        setUploadStatus('success');
        setStep('details');
    }
  }, [videoToEdit, isOpen, reset]);

  useEffect(() => {
    if (step === 'details' && file && uploadStatus === 'pending' && !videoId && !isEditing) {
      handleUpload();
    }
  }, [step, file, videoId, isEditing, handleUpload]);
  
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        videoElement.addEventListener('play', handlePlay);
        videoElement.addEventListener('pause', handlePause);
        return () => {
            videoElement.removeEventListener('play', handlePlay);
            videoElement.removeEventListener('pause', handlePause);
        }
    }
  }, [videoUrl])

  const isUploadComplete = uploadStatus === 'success';
  const hasChosenVisibility = Boolean(visibility);
  const canAdvanceFromDetails = Boolean(titleValue?.trim()) && (isUploadComplete || isEditing);
  const canAdvanceStep = step === 'details' ? canAdvanceFromDetails : isUploadComplete || isEditing;
  const detailsStepState =
    !titleValue?.trim() ? 'error' : isUploadComplete || isEditing ? 'complete' : uploadStatus === 'processing' ? 'warning' : step === 'details' ? 'active' : 'warning';
  const elementsStepState = isUploadComplete || isEditing ? 'complete' : uploadStatus === 'error' ? 'error' : 'warning';
  const checksStepState = uploadStatus === 'error' ? 'error' : isUploadComplete || isEditing ? 'complete' : uploadStatus === 'processing' || uploadStatus === 'uploading' ? 'warning' : 'pending';
  const visibilityStepState = visibility ? (step === 'visibility' ? 'active' : isUploadComplete || isEditing ? 'complete' : 'warning') : 'error';
  const stepStates = {
    details: detailsStepState,
    elements: elementsStepState,
    checks: checksStepState,
    visibility: visibilityStepState,
  } as const;

  const getFooterButton = () => {
      if(step === 'visibility') {
          return (
             <>
              <Button variant="secondary" className="rounded-full px-5" onClick={handleBack}>Back</Button>
              <Button variant="primary" className="rounded-full px-5" onClick={handlePublish} disabled={(!isUploadComplete && !isEditing) || !hasChosenVisibility}>
                {isEditing ? 'Save' : 'Publish'}
              </Button>
            </>
          )
      }
      return (
          <>
            <Button variant="secondary" className="rounded-full px-5" onClick={handleBack} disabled={step === 'details'}>Back</Button>
            <Button variant="primary" className="rounded-full px-5" onClick={handleNext} disabled={!canAdvanceStep}>Next</Button>
          </>
      )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-none bg-background p-0 text-foreground sm:left-[50%] sm:top-[50%] sm:h-[92vh] sm:max-h-[92vh] sm:w-[86vw] sm:translate-x-[-50%] sm:translate-y-[-50%] md:w-[78vw] md:rounded-[32px] lg:w-[1080px] lg:max-w-[1080px]">
        <DialogHeader className="flex flex-row items-center justify-between border-b p-4">
            <DialogTitle className="text-lg sm:text-2xl">{isEditing ? 'Edit video' : (step === 'select' ? 'Upload a video or Short' : step === 'published' ? '' : file?.name || 'Upload details')}</DialogTitle>
             <DialogDescription className="sr-only">A dialog to upload or edit video details.</DialogDescription>
        </DialogHeader>

        {step === 'select' && !isEditing ? (
          <UploadSelectStep
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            isDragActive={isDragActive}
            disabled={isLongUploadBlocked}
            quotaSummary={
              constraintsLoading ? (
                <p className="text-sm text-muted-foreground">Checking today&apos;s upload limits...</p>
              ) : renderConstraintSummary(longVideoConstraints, { muted: true })
            }
          />
        ) : step === 'published' ? (
          <UploadPublishedStep
            message={getPublishMessage({ isEditing, visibility })}
            videoId={videoId}
            onCopyLink={copyLink}
            onClose={handleClose}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
            <div className="px-4 md:px-6 pt-6">
                  <UploadDialogStepper currentStep={step} setStep={setStep} isComplete={isUploadComplete || isEditing} stepStates={stepStates} />
                {!isEditing ? (
                  <div className="mb-6">
                    {constraintsLoading && !longVideoConstraints ? (
                      <p className="text-sm text-muted-foreground">Checking today&apos;s upload limits...</p>
                    ) : (
                      renderConstraintSummary(longVideoConstraints)
                    )}
                  </div>
                ) : null}
                <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
                  <div className="space-y-6">
                    {step === 'details' && (
                       <div>
                      <form id="video-details-form" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div>
                          <Label htmlFor="title" className="flex items-center gap-1 mb-1">Title (required) <Info className="w-4 h-4 text-muted-foreground" /></Label>
                          <Textarea id="title" {...register('title')} />
                          {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                        </div>
                        <div>
                          <Label htmlFor="description" className="mb-1">Description</Label>
                          <Textarea id="description" {...register('description')} rows={5} placeholder="Tell viewers about your video (type @ to mention a channel)"/>
                        </div>
                      </form>

                        <Separator className="my-6" />

                        <div>
                            <h3 className="text-lg font-semibold">Thumbnail</h3>
                            <p className="text-sm text-muted-foreground mb-4">Select or upload a picture that shows what's in your video. A good thumbnail stands out and draws viewers' attention. <a href="#" className="text-accent">Learn more</a></p>
                            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                <div className="flex-shrink-0">
                                    <input type="file" accept="image/*" ref={thumbnailInputRef} className="hidden" onChange={handleThumbnailChange} />
                                    <div className="flex flex-col gap-3">
                                      <div className="space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Default thumbnail</p>
                                        <div className="relative h-20 w-32 overflow-hidden rounded-md border border-border bg-secondary">
                                          {generatedThumbnailPreview ? (
                                            <Image src={generatedThumbnailPreview} alt="Generated thumbnail preview" fill className="object-cover" />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Generating frame...</div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Custom thumbnail</p>
                                        <button 
                                            type="button"
                                            onClick={() => thumbnailInputRef.current?.click()}
                                            className="relative h-20 w-32 overflow-hidden rounded-md border border-border bg-secondary text-sm hover:bg-muted"
                                        >
                                            {customThumbnailPreview ? (
                                                <Image src={customThumbnailPreview} alt="Custom thumbnail preview" fill className="object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full flex-col items-center justify-center">
                                                  <Upload className="mb-2 w-8 h-8" />
                                                  <span>Upload custom</span>
                                                </div>
                                            )}
                                        </button>
                                      </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {errors.thumbnail && <p className="text-red-500 text-sm mb-2">{errors.thumbnail.message}</p>}
                                    <p className="text-xs text-muted-foreground">We generate a default thumbnail from the video automatically.</p>
                                    <p className="text-xs text-muted-foreground">Upload a custom thumbnail only if you want to override it. Recommended size: 1280x720.</p>
                                </div>
                            </div>
                        </div>
                         
                        <Separator className="my-6" />

                        <div>
                            <h3 className="text-lg font-semibold">Audience</h3>
                             <p className="text-sm text-muted-foreground">Regardless of your location, you're legally required to comply with the Children's Online Privacy Protection Act (COPPA) and/or other laws. You're required to tell us whether your videos are 'Made for Kids'. <a href="#" className="text-accent">What is 'Made for Kids' content?</a></p>
                            <Controller
                                control={control}
                                name="audience"
                                render={({ field }) => (
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="mt-4 space-y-2"
                                >
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="madeForKids" id="madeForKids" />
                                        <Label htmlFor="madeForKids">Yes, it's 'Made for Kids'.</Label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="notMadeForKids" id="notMadeForKids" />
                                         <Label htmlFor="notMadeForKids">No, it's not 'Made for Kids'</Label>
                                    </div>
                                </RadioGroup>
                                )}
                            />
                             <p className="text-xs text-muted-foreground mt-2">Features like personalised ads and notifications won't be available on videos 'Made for Kids'. Videos that are set as 'Made for Kids' by you are more likely to be recommended alongside other children's videos. <a href="#" className="text-accent">Learn more</a></p>
                        </div>

                        <Separator className="my-6" />

                        <h3 className="text-lg font-semibold">Show more</h3>
                        
                        <div className="space-y-6 pt-4 border-t border-transparent">
                            <div>
                                <Label htmlFor="tags">Tags</Label>
                                <p className="text-xs text-muted-foreground mb-2">Tags can be useful if content in your video is commonly misspelt. Otherwise, tags play a minimal role in helping viewers to find your video. <a href="#" className="text-accent">Learn more</a></p>
                                <div className="bg-secondary border rounded-md p-2 flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <Badge key={tag} variant="secondary">
                                            {tag}
                                            <button onClick={() => handleRemoveTag(tag)} className="ml-2">
                                                <X className="w-3 h-3"/>
                                            </button>
                                        </Badge>
                                    ))}
                                    <Input 
                                        id="tags" 
                                        placeholder="Add tag" 
                                        className="bg-transparent border-none flex-1 focus-visible:ring-0" 
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleAddTag}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Enter a comma after each tag</p>
                            </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="language">Video language</Label>
                                    <Controller
                                        control={control}
                                        name="language"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="w-full mt-2">
                                                    <SelectValue placeholder="Select"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="None">None</SelectItem>
                                                    <SelectItem value="English">English</SelectItem>
                                                    <SelectItem value="Spanish">Spanish</SelectItem>
                                                    <SelectItem value="French">French</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                 <div>
                                    <Label htmlFor="category">Category</Label>
                                     <Controller
                                        control={control}
                                        name="category"
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-full mt-2">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                {uploadCategories.map((cat) => (
                                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-semibold">Comments and ratings</h4>
                                <p className="text-xs text-muted-foreground mb-2">Choose if and how you want to show comments</p>
                                 <Controller
                                    control={control}
                                    name="commentsEnabled"
                                    render={({ field }) => (
                                         <Select onValueChange={(value) => field.onChange(value === 'true')} defaultValue={String(field.value)}>
                                            <SelectTrigger className="w-full mt-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Allow all comments</SelectItem>
                                                <SelectItem value="false">Disable comments</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <Controller
                                    control={control}
                                    name="showLikes"
                                    render={({ field }) => (
                                        <Checkbox 
                                            id="showLikes"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <label
                                htmlFor="showLikes"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                Show how many viewers like this video
                                </label>
                            </div>

                        </div>
                    </div>
                    )}
                    {step === 'elements' && <div>Video Elements Content</div>}
                    {step === 'checks' && <div>Checks Content</div>}
                    {step === 'visibility' && (
                         <div>
                            <h2 className="text-xl font-semibold mb-4">Visibility</h2>
                            <p className="text-sm text-muted-foreground mb-4">Choose when to publish and who can see your video</p>
                            <Controller
                                control={control}
                                name="visibility"
                                render={({ field }) => (
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="p-4 rounded-md border space-y-4"
                                >
                                    <div className="flex items-start space-x-3">
                                        <RadioGroupItem value="private" id="private" />
                                        <Label htmlFor="private" className="font-semibold text-base">
                                            Private
                                            <p className="font-normal text-sm text-muted-foreground">Only you and people that you choose can watch your video</p>
                                        </Label>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <RadioGroupItem value="unlisted" id="unlisted" />
                                         <Label htmlFor="unlisted" className="font-semibold text-base">
                                            Unlisted
                                            <p className="font-normal text-sm text-muted-foreground">Anyone with the video link can watch your video</p>
                                        </Label>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <RadioGroupItem value="public" id="public" />
                                         <Label htmlFor="public" className="font-semibold text-base">
                                            Public
                                            <p className="font-normal text-sm text-muted-foreground">Everyone can watch your video</p>
                                        </Label>
                                    </div>
                                </RadioGroup>
                                )}
                            />
                        </div>
                    )}
                  </div>

                  <div className="hidden lg:block lg:sticky top-6">
                      <div className="mb-4 aspect-video overflow-hidden rounded-[28px] border border-border/70 bg-black flex items-center justify-center relative group/videoplayer shadow-sm">
                          {(isUploadComplete || isEditing) && videoUrl ? (
                            <>
                              <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" onClick={togglePlay} />
                              {!isPlaying && (
                                <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/videoplayer:opacity-100 transition-opacity">
                                    <Play className="w-16 h-16 text-white" fill="white" />
                                </button>
                              )}
                            </>
                          ) : (
                             <div className="text-center text-muted-foreground p-4">
                                {(uploadStatus === 'uploading' || uploadStatus === 'processing' || uploadStatus === 'pending') && (
                                  <>
                                    <div className="flex items-center justify-center mb-2">
                                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> 
                                        {uploadStatus === 'uploading' ? `Uploading...` : 'Processing...'}
                                    </div>
                                    {(uploadStatus === 'uploading' || uploadStatus === 'processing') && <Progress value={uploadProgress} className="w-full h-1 bg-muted" />}
                                  </>
                                )}
                                 {uploadStatus === 'error' && (
                                     <p className="text-red-500">Upload failed. Please try again.</p>
                                 )}
                             </div>
                          )}
                      </div>
                      <div className="rounded-[24px] border border-border/70 bg-secondary/40 p-4 text-sm space-y-3">
                         <p><span className="font-semibold text-muted-foreground">Video link</span></p>
                         {videoId ? (
                             <Link href={`/watch/${videoId}`} className="text-accent break-all" target="_blank">
                                {typeof window !== 'undefined' && `${window.location.origin}/watch/${videoId}`}
                             </Link>
                         ) : (
                             <p className="text-muted-foreground">Link will be generated after upload.</p>
                         )}
                         <Separator/>
                         <p><span className="font-semibold text-muted-foreground">Filename</span></p>
                         <p className="break-all">{isEditing ? videoToEdit?.title : file?.name}</p>
                      </div>
                  </div>
                </div>
            </div>
            </ScrollArea>
            <DialogFooter className="mt-auto flex items-center justify-between border-t bg-background p-4">
                <div className="text-sm text-muted-foreground">
                          {getUploadStatusMessage({ isEditing, uploadStatus })}
                </div>
                <div className="flex gap-2">
                    {getFooterButton()}
                </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
