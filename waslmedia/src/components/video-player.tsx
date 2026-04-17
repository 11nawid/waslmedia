

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, ChevronLeft, Minimize2, Loader2, RefreshCw, WifiOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import type { Video } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { apiSend } from '@/lib/api/client';
import { createPlaybackSession, type PlaybackSessionResponse } from '@/lib/media/client';
import { getViewerAnalyticsContext } from '@/lib/analytics/viewer-context';
import { useFloatingVideoPlayer } from '@/components/floating-video-player';
import { useProgressRouter } from '@/hooks/use-progress-router';

interface VideoPlayerProps {
    video: Video;
    sourceContext?: string | null;
    enableMinimize?: boolean;
    initialTimeSeconds?: number;
}

export function VideoPlayer({ video, sourceContext, enableMinimize = false, initialTimeSeconds = 0 }: VideoPlayerProps) {
    const parseDurationText = (value: string | undefined) => {
        if (!value) {
            return 0;
        }

        const parts = value
            .split(':')
            .map((part) => Number.parseInt(part, 10))
            .filter((part) => Number.isFinite(part));

        if (parts.length === 0) {
            return 0;
        }

        return parts.reduce((total, part) => total * 60 + part, 0);
    };

    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const playbackSessionRef = useRef<PlaybackSessionResponse | null>(null);
    const initialSeekAppliedRef = useRef(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(() => parseDurationText(video.duration));
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<'main' | 'quality'>('main');
    const [currentQuality, setCurrentQuality] = useState('Auto');
    const [qualityOptions, setQualityOptions] = useState<string[]>(['Auto']);
    const [posterUrl, setPosterUrl] = useState<string | null>(video.thumbnailUrl || null);
    const hasRegisteredQualifiedView = useRef(false);
    const { openMiniPlayer } = useFloatingVideoPlayer();
    const router = useProgressRouter();

    const retryPlayback = useCallback(() => {
        setPlaybackError(null);
        setIsInitializing(true);
        setIsBuffering(false);
        setLoadAttempt((current) => current + 1);
    }, []);

    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds)) return '0:00';
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current?.play().catch((error) => {
                 if (error.name === 'NotAllowedError') {
                    console.log("Autoplay was prevented. User needs to interact with the page first.");
                 } else {
                    console.error("Video play error:", error);
                    setPlaybackError('Playback could not start. Try again.');
                 }
            });
        } else {
            videoRef.current?.pause();
        }
    };

    const handleMuteToggle = () => {
        if (videoRef.current) {
            const newMutedState = !videoRef.current.muted;
            videoRef.current.muted = newMutedState;
            setIsMuted(newMutedState);
            if (!newMutedState && volume === 0) {
                videoRef.current.volume = 0.5;
                setVolume(0.5);
            }
        }
    };
    
    const handleVolumeChange = (value: number[]) => {
        if (videoRef.current) {
            const newVolume = value[0];
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            
            const newMutedState = newVolume === 0;
            if (videoRef.current.muted !== newMutedState) {
                videoRef.current.muted = newMutedState;
                setIsMuted(newMutedState);
            }
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setProgress(videoRef.current.currentTime);
            if (Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
                setDuration(videoRef.current.duration);
            }
            if (
                !hasRegisteredQualifiedView.current &&
                videoRef.current.duration > 0 &&
                videoRef.current.currentTime / videoRef.current.duration >= 0.4
            ) {
                hasRegisteredQualifiedView.current = true;
                const analyticsContext = getViewerAnalyticsContext(sourceContext);
                apiSend(`/api/videos/${video.id}/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(analyticsContext),
                }).catch((error) => {
                    console.error('Failed to register qualified view', error);
                });
            }
        }
    };
    
    const handleProgressChange = (value: number[]) => {
        if (videoRef.current) {
            videoRef.current.currentTime = value[0];
            setProgress(value[0]);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            videoRef.current.muted = false;
            setIsMuted(false);
            if (videoRef.current.volume === 0) {
                videoRef.current.volume = 1;
                setVolume(1);
            }
            if (!initialSeekAppliedRef.current && initialTimeSeconds > 0) {
                videoRef.current.currentTime = initialTimeSeconds;
                initialSeekAppliedRef.current = true;
            }
            if (Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
                setDuration(videoRef.current.duration);
            }
            videoRef.current.play().catch(() => {
                setIsPlaying(false);
            });
        }
    };

    const handleDurationChange = () => {
        if (videoRef.current && Number.isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleMinimize = async () => {
        if (!enableMinimize || !videoRef.current) {
            return;
        }

        try {
            const session = playbackSessionRef.current || (await createPlaybackSession(video.id, 'watch'));
            playbackSessionRef.current = session;
            const videoElement = videoRef.current;

            flushSync(() => {
                void openMiniPlayer({
                    video,
                    sourceUrl: session.directSourceUrl,
                    startTime: videoElement.currentTime,
                    autoplay: !videoElement.paused,
                    muted: false,
                    volume: videoElement.volume > 0 ? videoElement.volume : 1,
                });
            });
            router.replace('/');
        } catch (error) {
            console.error('Failed to minimize player', error);
        }
    };

    const getPlaybackIssueMessage = () => {
        if (isOffline) {
            return 'Please check your connection and try again.';
        }

        if (playbackError) {
            return 'Something interrupted the video for a moment.';
        }

        if (isBuffering && !isInitializing) {
            return 'Hang tight, the video will keep going in a moment.';
        }

        return 'Getting your video ready.';
    };

    const isStatusVisible = isInitializing || isBuffering;
    const showPlaybackBanner = Boolean(playbackError || isOffline);

    const applyQuality = (qualityLabel: string) => {
        setCurrentQuality(qualityLabel);
    };

    const handleFullscreen = () => {
        if (playerRef.current) {
            if (!document.fullscreenElement) {
                playerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000); 
        }
    };
    
    const handleMouseLeave = () => {
        if (isPlaying) {
           setShowControls(false);
        }
    };


    const handleKeyDown = (e: KeyboardEvent) => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                handlePlayPause();
                break;
            case 'KeyF':
                handleFullscreen();
                break;
            case 'ArrowLeft':
                if (videoRef.current) videoRef.current.currentTime -= 5;
                break;
            case 'ArrowRight':
                 if (videoRef.current) videoRef.current.currentTime += 5;
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (videoRef.current) {
                    const newVolume = Math.min(videoRef.current.volume + 0.1, 1);
                    handleVolumeChange([newVolume]);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (videoRef.current) {
                    const newVolume = Math.max(videoRef.current.volume - 0.1, 0);
                    handleVolumeChange([newVolume]);
                }
                break;
            case 'KeyM':
                handleMuteToggle();
                break;
        }
    }

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const onPlay = () => {
            setIsPlaying(true);
            setIsInitializing(false);
            setIsBuffering(false);
            setPlaybackError(null);
        };
        const onPause = () => setIsPlaying(false);
        const onLoadStart = () => {
            setIsInitializing(true);
            setIsBuffering(true);
            setPlaybackError(null);
        };
        const onCanPlay = () => {
            setIsInitializing(false);
            setIsBuffering(false);
        };
        const onWaiting = () => {
            if (typeof navigator === 'undefined' || navigator.onLine) {
                setIsBuffering(true);
            }
        };
        const onSeeking = () => setIsBuffering(true);
        const onSeeked = () => setIsBuffering(false);
        const onStalled = () => {
            if (typeof navigator === 'undefined' || navigator.onLine) {
                setIsBuffering(true);
            }
        };
        const onSuspend = () => {
            if (!videoElement.paused && videoElement.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
                setIsBuffering(true);
            }
        };
        const onVideoError = () => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                setPlaybackError('No internet connection. Reconnect to continue playback.');
            } else {
                setPlaybackError('Video could not be loaded right now. Please try again.');
            }
            setIsInitializing(false);
            setIsBuffering(false);
        };
        const onOnline = () => {
            setIsOffline(false);
        };
        const onOffline = () => {
            setIsOffline(true);
            setIsBuffering(false);
            setPlaybackError('No internet connection. Reconnect to continue playback.');
        };

        videoElement.addEventListener('play', onPlay);
        videoElement.addEventListener('pause', onPause);
        videoElement.addEventListener('loadstart', onLoadStart);
        videoElement.addEventListener('canplay', onCanPlay);
        videoElement.addEventListener('playing', onCanPlay);
        videoElement.addEventListener('waiting', onWaiting);
        videoElement.addEventListener('seeking', onSeeking);
        videoElement.addEventListener('seeked', onSeeked);
        videoElement.addEventListener('stalled', onStalled);
        videoElement.addEventListener('suspend', onSuspend);
        videoElement.addEventListener('error', onVideoError);
        videoElement.addEventListener('timeupdate', handleTimeUpdate);
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('durationchange', handleDurationChange);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        return () => {
            videoElement.removeEventListener('play', onPlay);
            videoElement.removeEventListener('pause', onPause);
            videoElement.removeEventListener('loadstart', onLoadStart);
            videoElement.removeEventListener('canplay', onCanPlay);
            videoElement.removeEventListener('playing', onCanPlay);
            videoElement.removeEventListener('waiting', onWaiting);
            videoElement.removeEventListener('seeking', onSeeking);
            videoElement.removeEventListener('seeked', onSeeked);
            videoElement.removeEventListener('stalled', onStalled);
            videoElement.removeEventListener('suspend', onSuspend);
            videoElement.removeEventListener('error', onVideoError);
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('durationchange', handleDurationChange);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    useEffect(() => {
        if (typeof navigator === 'undefined') {
            return;
        }

        setIsOffline(!navigator.onLine);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const videoElement = videoRef.current;

        const loadPlayback = async () => {
            if (!videoElement) {
                return;
            }

            setIsInitializing(true);
            setIsBuffering(true);
            setPlaybackError(null);
            playbackSessionRef.current = null;
            initialSeekAppliedRef.current = false;
            videoElement.removeAttribute('src');
            videoElement.load();
            const session = await createPlaybackSession(video.id, 'watch');
            playbackSessionRef.current = session;

            if (cancelled) {
                return;
            }

            setPosterUrl(video.thumbnailUrl || session.thumbnailUrl || null);
            setQualityOptions(['Auto']);
            setCurrentQuality('Auto');

            if (cancelled) {
                return;
            }
            videoElement.src = session.directSourceUrl;
            videoElement.load();
        };

        loadPlayback().catch((error) => {
            console.error('Failed to initialize playback session', error);
            setPosterUrl(video.thumbnailUrl || null);
            setQualityOptions(['Auto']);
            setPlaybackError(isOffline ? 'No internet connection. Reconnect to continue playback.' : 'Video could not be loaded right now. Please try again.');
            setIsInitializing(false);
            setIsBuffering(false);
        });

        return () => {
            cancelled = true;
        };
    }, [isOffline, loadAttempt, video.id, video.thumbnailUrl]);

    return (
        <div 
            ref={playerRef} 
            className="relative aspect-video w-full bg-black lg:rounded-xl overflow-hidden group/player"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onContextMenu={(event) => event.preventDefault()}
        >
            <video
                ref={videoRef}
                poster={posterUrl || undefined}
                className="w-full h-full object-contain"
                playsInline
                onClick={handlePlayPause}
                onContextMenu={(event) => event.preventDefault()}
                controlsList="nodownload noplaybackrate noremoteplayback"
                disablePictureInPicture
                disableRemotePlayback
            >
                Your browser does not support the video tag.
            </video>
            <div 
                className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity",
                    showControls ? 'opacity-100' : 'opacity-0'
                )}
                onClick={handlePlayPause}
            ></div>
            {isStatusVisible ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-medium">
                            {isBuffering && !isInitializing ? 'Just a moment...' : 'Getting things ready...'}
                        </span>
                    </div>
                </div>
            ) : null}
            {showPlaybackBanner ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-4">
                    <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-black/65 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
                        {isOffline ? <WifiOff className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{isOffline ? 'Connection lost' : 'Video paused for a moment'}</p>
                            <p className="text-xs text-white/80">{getPlaybackIssueMessage()}</p>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:opacity-60"
                            onClick={retryPlayback}
                            disabled={isOffline}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </div>
                </div>
            ) : null}

            <div className={cn(
                "absolute bottom-0 left-0 right-0 p-3 text-white transition-opacity",
                showControls ? 'opacity-100' : 'opacity-0'
            )}>
                <Slider
                    defaultValue={[0]}
                    value={[progress]}
                    max={duration}
                    step={1}
                    onValueChange={handleProgressChange}
                    className="w-full h-2 [&>span:first-child]:h-2 mb-2"
                />
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white rounded-full" onClick={handlePlayPause}>
                            {isPlaying ? <Pause className="h-6 w-6" fill="white" /> : <Play className="h-6 w-6" fill="white" />}
                        </Button>
                        
                        <div className="flex items-center gap-2 group/volume">
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white rounded-full" onClick={handleMuteToggle}>
                                {isMuted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                            </Button>
                            <div className="w-20 hidden group-hover/volume:block">
                                <Slider 
                                    defaultValue={[1]}
                                    value={[isMuted ? 0 : volume]}
                                    max={1}
                                    step={0.1}
                                    onValueChange={handleVolumeChange}
                                    className="w-full h-1"
                                />
                            </div>
                        </div>
                        
                        <span className="text-sm">{formatTime(progress)} / {formatTime(duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                         
                        <Popover open={isSettingsOpen} onOpenChange={(open) => {
                            setIsSettingsOpen(open);
                            if (!open) setActiveMenu('main');
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white rounded-full">
                                    <Settings className="h-6 w-6" />
                                </Button>
                            </PopoverTrigger>
                             <PopoverContent className="w-60 p-2 bg-background/90 backdrop-blur-sm border-border/50 text-foreground mb-2" side="top" align="end">
                                {activeMenu === 'main' && (
                                    <div className="space-y-1">
                                        <div 
                                            className="text-sm p-2 cursor-pointer hover:bg-secondary rounded-md flex justify-between"
                                            onClick={() => setActiveMenu('quality')}
                                        >
                                            <span>Quality</span>
                                            <span className="text-muted-foreground">{currentQuality} &gt;</span>
                                        </div>
                                    </div>
                                )}
                                {activeMenu === 'quality' && (
                                     <div className="space-y-1">
                                        <div className="flex items-center border-b pb-2 mb-1">
                                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setActiveMenu('main')}>
                                                <ChevronLeft className="h-5 w-5"/>
                                            </Button>
                                            <h4 className="font-semibold text-sm">Quality</h4>
                                        </div>
                                        {qualityOptions.map(q => (
                                        <div 
                                            key={q} 
                                            className="text-sm p-2 cursor-pointer hover:bg-secondary rounded-md flex items-center"
                                            onClick={() => {
                                                applyQuality(q);
                                                setActiveMenu('main');
                                            }}
                                        >
                                                {q === currentQuality && <span className="mr-2">&bull;</span>}
                                                {q}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        {enableMinimize ? (
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white rounded-full" onClick={handleMinimize}>
                                <Minimize2 className="h-6 w-6" />
                            </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white rounded-full" onClick={handleFullscreen}>
                            <Maximize className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
