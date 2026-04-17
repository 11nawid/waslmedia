

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useShortsUploadDialog } from '@/hooks/use-shorts-upload-dialog';
import { UploadCloud, FileVideo, CheckCircle, Image as ImageIcon, Sparkles, TestTube2, Info, X, Loader2, Upload, Play, Copy, Pause, Music } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import type { AudioTrack } from '@/lib/audio/types';
import { defaultAudioTracks } from '@/lib/default-audios';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { uploadFileToStorage } from '@/lib/storage/client';
import { sanitizeFileName } from '@/lib/storage/shared';
import { apiSend } from '@/lib/api/client';
import { generateVideoThumbnailFile, inspectVideoFile } from './upload-dialog-helpers';
import Image from 'next/image';
import { useProgressRouter } from '@/hooks/use-progress-router';
import {
  getVideoUploadConstraintsClient,
  syncVideoUploadConstraints,
  UPLOAD_CONSTRAINTS_SYNC_EVENT,
} from '@/lib/video-upload/client';
import { buildUploadConstraintSummary, getVideoUploadErrorMessage } from '@/lib/video-upload/ui';
import { type VideoUploadConstraints } from '@/lib/video-upload/rules';
import { useUploadDialog } from '@/hooks/use-upload-dialog';

type UploadStep = 'select' | 'details' | 'visibility' | 'published';

type ShortStepState = 'complete' | 'warning' | 'error' | 'active' | 'pending';

function getStepTone(state: ShortStepState) {
  switch (state) {
    case 'complete':
      return { label: 'text-emerald-500', bar: 'bg-emerald-500' };
    case 'warning':
      return { label: 'text-amber-500', bar: 'bg-amber-500' };
    case 'error':
      return { label: 'text-rose-500', bar: 'bg-rose-500' };
    case 'active':
      return { label: 'text-primary', bar: 'bg-primary' };
    default:
      return { label: 'text-muted-foreground group-hover:text-foreground/80', bar: 'bg-border' };
  }
}

const Stepper = ({ currentStep, setStep, isComplete, stepStates }: { currentStep: UploadStep, setStep: (step: UploadStep) => void, isComplete: boolean, stepStates: Record<'details' | 'visibility', ShortStepState> }) => {
    const steps: Array<{ id: 'details' | 'visibility', name: string }> = [
        { id: 'details', name: 'Details' },
        { id: 'visibility', name: 'Visibility' },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <div className="flex justify-between items-center mb-8">
            {steps.map((step, index) => (
                <button
                    key={step.id}
                    onClick={() => isComplete && setStep(step.id)}
                    className="step-item flex-1 rounded-2xl px-2 py-2 text-center group"
                    disabled={!isComplete}
                >
                    <span className={`text-sm ${getStepTone(stepStates[step.id]).label}`}>{step.name}</span>
                    <div className={`mx-auto mt-2 h-1.5 rounded-full ${getStepTone(stepStates[step.id]).bar}`} />
                </button>
            ))}
        </div>
    );
};

function renderShortsConstraintSummary(summary: VideoUploadConstraints['shorts'] | null) {
  if (!summary) {
    return null;
  }

  const labels = buildUploadConstraintSummary(summary, 'Shorts');
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/30 p-4 text-left">
      <p className="text-sm font-semibold text-foreground">{labels.remainingLabel}</p>
      <p className="mt-1 text-sm text-muted-foreground">Shorts must be 2 minutes or less.</p>
      {labels.nextAvailableLabel ? <p className="mt-1 text-xs text-muted-foreground">{labels.nextAvailableLabel}</p> : null}
    </div>
  );
}


export function ShortsUploadDialog() {
  const { user } = useAuth();
  const { isOpen, onClose, videoToEdit, pendingFile } = useShortsUploadDialog();
  const { onOpen: onOpenVideoUpload } = useUploadDialog();
  const { toast } = useToast();
  const router = useProgressRouter();

  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [summary, setSummary] = useState('');
  const [timestamps, setTimestamps] = useState('');
  const [credits, setCredits] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted' | ''>('');

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'pending' | 'uploading' | 'processing' | 'success' | 'error'>('pending');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [generatedThumbnailFile, setGeneratedThumbnailFile] = useState<File | null>(null);
  const [generatedThumbnailPreview, setGeneratedThumbnailPreview] = useState<string | null>(null);
  const [customThumbnailPreview, setCustomThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadConstraints, setUploadConstraints] = useState<VideoUploadConstraints | null>(null);
  const [constraintsLoading, setConstraintsLoading] = useState(false);
  const shortStepStates = {
    details: !caption.trim() ? 'error' : uploadStatus === 'error' ? 'error' : uploadStatus === 'processing' || uploadStatus === 'uploading' ? 'warning' : uploadStatus === 'success' || isEditing ? 'complete' : step === 'details' ? 'active' : 'warning',
    visibility: !visibility ? 'error' : step === 'visibility' ? 'active' : uploadStatus === 'success' || isEditing ? 'complete' : 'pending',
  } as const;
  const shortUploadConstraints = uploadConstraints?.shorts || null;
  const isShortUploadBlocked = Boolean(shortUploadConstraints && shortUploadConstraints.remaining <= 0);

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
      console.error('Failed to load short upload constraints', error);
      return null;
    } finally {
      setConstraintsLoading(false);
    }
  }, [user]);

  const switchToRegularVideoUpload = useCallback(() => {
    if (!file || isEditing) {
      return;
    }

    onClose();
    onOpenVideoUpload(undefined, file);
  }, [file, isEditing, onClose, onOpenVideoUpload]);

  const resetState = useCallback(() => {
    setFile(null);
    setCaption('');
    setDescription('');
    setTags([]);
    setTagInput('');
    setSummary('');
    setTimestamps('');
    setCredits('');
    setUploadProgress(0);
    setUploadStatus('pending');
    setVideoUrl(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setLocalPreviewUrl(null);
    if (generatedThumbnailPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(generatedThumbnailPreview);
    }
    if (customThumbnailPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(customThumbnailPreview);
    }
    setVideoId(null);
    setThumbnailUrl(null);
    setGeneratedThumbnailFile(null);
    setGeneratedThumbnailPreview(null);
    setCustomThumbnailPreview(null);
    setThumbnailFile(null);
    setVisibility('');
    setStep('select');
    setIsEditing(false);
  }, [customThumbnailPreview, generatedThumbnailPreview, localPreviewUrl]);

  const prepareSelectedShort = useCallback(async (selectedFile: File) => {
    if (shortUploadConstraints?.remaining === 0) {
      const labels = buildUploadConstraintSummary(shortUploadConstraints, 'Shorts');
      toast({
        title: 'Daily Shorts limit reached',
        description: labels.nextAvailableLabel || labels.remainingLabel,
        variant: 'destructive',
      });
      return false;
    }

    const metadata = await inspectVideoFile(selectedFile);

    if (metadata.durationSeconds > 120) {
      toast({
        title: 'Video Too Long',
        description: 'Shorts must be under 2 minutes.',
        variant: 'destructive',
      });
      return false;
    }

    setFile(selectedFile);
    setLocalPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(selectedFile);
    });
    const autoThumbnailFile = await generateVideoThumbnailFile(selectedFile, {
      atSeconds: Math.min(Math.max(metadata.durationSeconds * 0.2, 0.15), 1),
    }).catch(() => null);
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
    setThumbnailFile(null);
    setCaption(selectedFile.name.replace(/\.[^/.]+$/, ''));
    setStep('details');
    return true;
  }, [shortUploadConstraints, toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) {
      return;
    }

    prepareSelectedShort(selectedFile).catch((error) => {
      console.error('Failed to inspect short upload:', error);
      toast({
        title: 'Video could not be loaded',
        description: 'Please try another file.',
        variant: 'destructive',
      });
    });
  }, [prepareSelectedShort, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {'video/*':[]},
    multiple: false,
    disabled: isShortUploadBlocked,
  });

   const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === ',' && tagInput.trim()) {
          e.preventDefault();
          const newTag = tagInput.trim().replace(/,$/, '');
          if (newTag && !tags.includes(newTag)) {
              setTags([...tags, newTag]);
          }
          setTagInput('');
      }
  }

  const handleRemoveTag = (tagToRemove: string) => {
      setTags(tags.filter(tag => tag !== tagToRemove));
  }

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setThumbnailFile(selectedFile);
    setCustomThumbnailPreview((current) => {
      if (current?.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(selectedFile);
    });
  };


  const handlePublish = async () => {
    if ((!file && !isEditing) || !user || !caption || !visibility) {
      toast({ title: 'Please select a file, add a caption, and choose visibility.', variant: 'destructive' });
      return;
    }
    
    if(!videoId) {
        toast({ title: 'Video ID not found. Upload may not be complete.', variant: 'destructive' });
        return;
    }

    setUploadStatus('processing');

    try {
        let finalThumbnailUrl = thumbnailUrl;

        if (thumbnailFile && user) {
            const thumbnailPath = `${user.uid}/shorts/${crypto.randomUUID()}_${sanitizeFileName(thumbnailFile.name)}`;
            const thumbnailUpload = await uploadFileToStorage({
                bucket: 'thumbnails',
                objectKey: thumbnailPath,
                file: thumbnailFile,
            });
            finalThumbnailUrl = thumbnailUpload.storageRef;
            setThumbnailUrl(finalThumbnailUrl);
        }

        await apiSend(`/api/videos/${videoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            title: caption,
            description,
            visibility,
            tags,
            summary,
            timestamps,
            credits,
            thumbnailUrl: finalThumbnailUrl || undefined,
            }),
        });

      setUploadStatus('success');
      toast({ title: isEditing ? 'Short updated!' : 'Short published!' });
      onClose();
      router.refresh();
      
    } catch (error: any) {
      setUploadStatus('error');
      toast({ title: 'Publishing failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpload = async () => {
      if (!file || !user) return;

      const latestConstraints = await refreshUploadConstraints();
      if (latestConstraints?.shorts.remaining === 0) {
        const labels = buildUploadConstraintSummary(latestConstraints.shorts, 'Shorts');
        setUploadStatus('error');
        toast({
          title: 'Daily Shorts limit reached',
          description: labels.nextAvailableLabel || labels.remainingLabel,
          variant: 'destructive',
        });
        return;
      }
      
      setUploadStatus('uploading');
      
      try {
        const metadata = await inspectVideoFile(file);
        const extension = file.name.split('.').pop() || 'mp4';
        const filePath = `${user.uid}/shorts/${crypto.randomUUID()}.${sanitizeFileName(extension)}`;
        const resolvedThumbnailFile =
          thumbnailFile ||
          generatedThumbnailFile ||
          (await generateVideoThumbnailFile(file, { atSeconds: Math.min(Math.max(metadata.durationSeconds * 0.2, 0.15), 1) }).catch(() => null));
        const uploadResult = await uploadFileToStorage({
            bucket: 'videos',
            objectKey: filePath,
            file,
            mediaKind: 'short',
        });

        let initialThumbnailUrl = '';
        if (resolvedThumbnailFile) {
            const thumbnailPath = `${user.uid}/shorts/${crypto.randomUUID()}_${sanitizeFileName(resolvedThumbnailFile.name)}`;
            const thumbnailUpload = await uploadFileToStorage({
                bucket: 'thumbnails',
                objectKey: thumbnailPath,
                file: resolvedThumbnailFile,
            });
            initialThumbnailUrl = thumbnailUpload.storageRef;
            setThumbnailUrl(initialThumbnailUrl);
        }
        
        const created = await apiSend<{ video: { id: string } }>('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            title: caption,
            sourceBucket: uploadResult.bucket,
            sourceObjectKey: uploadResult.objectKey,
            thumbnailUrl: initialThumbnailUrl,
            duration: metadata.durationLabel,
            audience: 'notMadeForKids',
            tags: ['shorts'],
            category: 'Shorts',
            summary,
            timestamps,
            credits,
            }),
        });
        setVideoId(created.video.id);
        setVideoUrl(localPreviewUrl || null);
        syncVideoUploadConstraints();
        void refreshUploadConstraints();
        setUploadStatus('success');
      } catch (error: any) {
        setUploadStatus('error');
        void refreshUploadConstraints();
        toast({ title: 'Upload failed', description: getVideoUploadErrorMessage(error.message, { kind: 'short' }), variant: 'destructive' });
      }
  }

  const togglePlay = () => {
    if (videoRef.current) {
        if (videoRef.current.paused) {
            videoRef.current.play();
        } else {
            videoRef.current.pause();
        }
    }
  }

  useEffect(() => {
    if (videoToEdit && isOpen) {
        setIsEditing(true);
        setVideoId(videoToEdit.id);
        setCaption(videoToEdit.title);
        setDescription(videoToEdit.description || '');
        setTags(videoToEdit.tags.filter(t => t !== 'shorts'));
        setSummary(videoToEdit.summary || '');
        setTimestamps(videoToEdit.timestamps || '');
        setCredits(videoToEdit.credits || '');
        setVisibility(videoToEdit.visibility || '');
        setVideoUrl(videoToEdit.videoUrl || null);
        setThumbnailUrl(videoToEdit.thumbnailUrl || null);
        setGeneratedThumbnailFile(null);
        setGeneratedThumbnailPreview(videoToEdit.thumbnailUrl || null);
        setCustomThumbnailPreview(null);
        
        setUploadStatus('success');
        setStep('details');
    }
  }, [videoToEdit, isOpen]);


  useEffect(() => {
    if (step === 'details' && file && uploadStatus === 'pending' && !videoId && !isEditing) {
      handleUpload();
    }
  }, [step, file, videoId, isEditing]);


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

    prepareSelectedShort(pendingFile).catch((error) => {
      console.error('Failed to prepare pending short upload:', error);
      toast({
        title: 'Video could not be loaded',
        description: 'Please try another file.',
        variant: 'destructive',
      });
      onClose();
    });
  }, [file, isOpen, onClose, pendingFile, prepareSelectedShort, toast, videoToEdit]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        videoElement.addEventListener('play', onPlay);
        videoElement.addEventListener('pause', onPause);
        return () => {
            videoElement.removeEventListener('play', onPlay);
            videoElement.removeEventListener('pause', onPause);
        }
    }
  }, [videoUrl]);


  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-border/80 bg-card p-0 text-card-foreground sm:left-[50%] sm:top-[50%] sm:h-[92vh] sm:max-h-[92vh] sm:w-[86vw] sm:translate-x-[-50%] sm:translate-y-[-50%] md:max-w-4xl md:rounded-[32px]">
        <DialogHeader className="p-6">
          <DialogTitle className="text-center text-xl sm:text-2xl">
            {isEditing ? 'Edit Short' : step === 'select' ? 'Upload a Short' : caption || "Edit details"}
          </DialogTitle>
          <DialogDescription className="sr-only">A dialog to upload a short video.</DialogDescription>
        </DialogHeader>
        
        {step === 'select' && !isEditing ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div {...getRootProps()} className={`flex h-full w-full flex-col items-center justify-center rounded-[32px] border border-dashed ${isShortUploadBlocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${isDragActive ? 'border-accent bg-accent/10' : 'border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/45'}`}>
                    <input {...getInputProps()} />
                    <div className="mb-8 rounded-full border border-border/70 bg-secondary p-6">
                        <UploadCloud className="h-20 w-20 text-muted-foreground" />
                    </div>
                    <p className="mb-2 text-2xl font-semibold tracking-tight">Upload a Short</p>
                    <p className="mb-8 max-w-xl text-muted-foreground">Drop a vertical video here or choose one from your device. You&apos;ll choose the final visibility before publishing.</p>
                    <div className="mb-6 w-full max-w-xl text-sm">
                      {constraintsLoading ? (
                        <p className="text-muted-foreground">Checking today&apos;s Shorts limits...</p>
                      ) : (
                        renderShortsConstraintSummary(shortUploadConstraints)
                      )}
                    </div>
                    <Button variant="primary" className="pointer-events-none rounded-full px-6">
                        {isShortUploadBlocked ? 'Daily limit reached' : 'Select file'}
                    </Button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col md:flex-row gap-6 items-start overflow-y-auto px-6 pb-6">
                {/* Form */}
                <div className="flex-1 w-full space-y-4">
                  {(step === 'details' || step === 'visibility') && (
                    <Stepper currentStep={step} setStep={setStep} isComplete={uploadStatus === 'success' || isEditing} stepStates={shortStepStates} />
                  )}
                    {!isEditing ? (
                      constraintsLoading && !shortUploadConstraints ? (
                        <p className="text-sm text-muted-foreground">Checking today&apos;s Shorts limits...</p>
                      ) : (
                        renderShortsConstraintSummary(shortUploadConstraints)
                      )
                    ) : null}
                    {!isEditing && file ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-full"
                        onClick={switchToRegularVideoUpload}
                      >
                        Post this as a regular video instead
                      </Button>
                    ) : null}

                    {step === 'details' && (
                        <>
                            <div>
                                <Label htmlFor="caption">Caption</Label>
                                <Input id="caption" value={caption} onChange={e => setCaption(e.target.value)} className="mt-1 bg-background/80" placeholder="Add a title for your Short"/>
                            </div>
                            <div>
                                <Label htmlFor="tags">Tags</Label>
                                <p className="mb-2 text-xs text-muted-foreground">Separate tags with a comma.</p>
                                <div className="flex flex-wrap gap-2 rounded-md border border-border bg-background/80 p-2">
                                    {tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="bg-secondary text-secondary-foreground">
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
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 bg-background/80" rows={3}/>
                            </div>
                            <div>
                                <Label>Thumbnail</Label>
                                <p className="mb-3 text-xs text-muted-foreground">Upload a custom reel cover or leave it empty and we&apos;ll grab a frame from the video automatically.</p>
                                <input
                                  ref={thumbnailInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleThumbnailChange}
                                />
                                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                  <div className="flex flex-col gap-3">
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Default thumbnail</p>
                                      <div className="relative h-24 w-20 overflow-hidden rounded-2xl border border-border/70 bg-secondary/40">
                                        {generatedThumbnailPreview ? (
                                          <Image
                                            src={generatedThumbnailPreview}
                                            alt="Generated short thumbnail preview"
                                            fill
                                            className="object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
                                            Grabbing a frame...
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Custom thumbnail</p>
                                      <button
                                        type="button"
                                        onClick={() => thumbnailInputRef.current?.click()}
                                        className="relative flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-secondary/40 hover:bg-secondary/60"
                                      >
                                        {customThumbnailPreview ? (
                                          <Image
                                            src={customThumbnailPreview}
                                            alt="Custom short thumbnail preview"
                                            fill
                                            className="object-cover"
                                          />
                                        ) : (
                                          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                                            <Upload className="h-5 w-5" />
                                            <span>Upload</span>
                                          </div>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-2 text-xs text-muted-foreground">
                                    <p>Recommended size: 1080 x 1920.</p>
                                    <p>We automatically use a frame from the reel as the default cover.</p>
                                    <p>Upload a custom thumbnail only if you want to override that default.</p>
                                  </div>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="summary">Summary of video</Label>
                                <Textarea id="summary" value={summary} onChange={e => setSummary(e.target.value)} className="mt-1 bg-background/80" rows={2}/>
                            </div>
                            <div>
                                <Label htmlFor="timestamps">Timestamps</Label>
                                <Textarea id="timestamps" value={timestamps} onChange={e => setTimestamps(e.target.value)} className="mt-1 bg-background/80" rows={3} placeholder="0:00 - Intro&#x0a;0:15 - The fun part"/>
                            </div>
                            <div>
                                <Label htmlFor="credits">Credit (audio or clips)</Label>
                                <Input id="credits" value={credits} onChange={e => setCredits(e.target.value)} className="mt-1 bg-background/80" placeholder="Audio by Artist Name"/>
                            </div>
                        </>
                    )}
                     {step === 'visibility' && (
                         <div>
                            <h2 className="text-xl font-semibold mb-4">Visibility</h2>
                            <p className="mb-4 text-sm text-muted-foreground">Choose who can see your Short</p>
                            <RadioGroup value={visibility} onValueChange={(v:any) => setVisibility(v)} className="space-y-4 rounded-md border border-border p-4">
                                <div className="flex items-start space-x-3">
                                    <RadioGroupItem value="private" id="private" />
                                    <Label htmlFor="private" className="font-semibold text-base">
                                        Private
                                        <p className="font-normal text-sm text-muted-foreground">Only you and people that you choose can watch</p>
                                    </Label>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <RadioGroupItem value="unlisted" id="unlisted" />
                                        <Label htmlFor="unlisted" className="font-semibold text-base">
                                        Unlisted
                                        <p className="font-normal text-sm text-muted-foreground">Anyone with the link can watch</p>
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
                        </div>
                    )}
                </div>

                {/* Preview */}
                    <div className="w-full md:w-1/3 flex flex-col items-center gap-4 sticky top-0">
                    <div className="w-48 h-80 bg-black rounded-[28px] border border-border/70 flex items-center justify-center overflow-hidden relative group/player">
                        {videoUrl ? (
                            <>
                                <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" loop onClick={togglePlay} />
                                <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover/player:opacity-100 transition-opacity bg-black/30">
                                    {isPlaying ? <Pause className="w-12 h-12" fill="white" /> : <Play className="w-12 h-12" fill="white" />}
                                </button>
                            </>
                        ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                                {uploadStatus === 'uploading' && <Loader2 className="w-8 h-8 animate-spin" />}
                                {uploadStatus === 'error' && <p className="text-sm text-red-500">Upload failed.</p>}
                             </div>
                        )}
                    </div>
                    {uploadStatus === 'uploading' && <Progress value={uploadProgress} className="w-full" />}
                    {uploadStatus === 'processing' && <p className="flex items-center gap-2 text-sm text-amber-500"><Loader2 className="animate-spin"/> Processing...</p>}
                    {uploadStatus === 'success' && <p className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-500"><CheckCircle /> Upload complete!</p>}
                    {uploadStatus === 'error' && <p className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-500">Upload failed</p>}
                </div>
            </div>
        )}

        {step !== 'select' && (
            <DialogFooter className="mt-auto border-t border-border/80 px-6 py-4">
                {step === 'details' && (
                     <Button variant="primary" className="rounded-full px-6" onClick={() => setStep('visibility')} disabled={uploadStatus !== 'success' || !caption.trim()}>
                        Next
                    </Button>
                )}
                {step === 'visibility' && (
                    <div className="w-full flex justify-between">
                         <Button variant="secondary" className="rounded-full px-6" onClick={() => setStep('details')}>Back</Button>
                         <Button variant="primary" className="rounded-full px-6" onClick={handlePublish} disabled={!visibility}>{isEditing ? 'Save' : 'Publish'}</Button>
                    </div>
                )}
            </DialogFooter>
        )}

      </DialogContent>
    </Dialog>
    </>
  );
}
