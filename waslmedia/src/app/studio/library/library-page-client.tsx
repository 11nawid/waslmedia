'use client';

import { useState, useMemo, useRef, useEffect, useTransition, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Play, Download, Pause, UploadCloud, X, Loader2, Music } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { uploadFileToStorage } from '@/lib/storage/client';
import { sanitizeFileName } from '@/lib/storage/shared';
import { createPublishedAudioTrack, getAudioTracks } from '@/lib/audio/client';
import type { AudioTrack } from '@/lib/audio/types';
import { EmptyState } from '@/components/empty-state';
import { useStudioStore } from '@/hooks/use-studio-store';
import { trackGlobalForegroundTask } from '@/hooks/use-global-load-progress';

function PublishAudioDialog({ isOpen, onClose, onAudioPublished }: { isOpen: boolean; onClose: () => void; onAudioPublished: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setAudioFile(acceptedFiles[0]);
        if (!title) {
          setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ''));
        }
      }
    },
    [title]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'audio/mpeg': ['.mp3'] }, maxFiles: 1 });

  const handleSubmit = async () => {
    if (!user || !audioFile || !title || !artist || !genre || !mood) {
      toast({ title: 'Please fill all fields and select a file.', variant: 'destructive' });
      return;
    }

    startTransition(async () => {
      try {
        const filePath = `${user.uid}/${Date.now()}_${sanitizeFileName(audioFile.name)}`;
        const uploadResult = await uploadFileToStorage({
          bucket: 'freeaudio',
          objectKey: filePath,
          file: audioFile,
        });
        const storageRef = uploadResult.storageRef;
        const audio = new Audio(URL.createObjectURL(audioFile));
        audio.onloadedmetadata = async () => {
          const durationInSeconds = audio.duration;
          const mins = Math.floor(durationInSeconds / 60);
          const secs = Math.floor(durationInSeconds % 60);
          const formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;

          await createPublishedAudioTrack({
            title,
            artist,
            genre,
            mood,
            url: storageRef,
            duration: formattedDuration,
          });

          toast({ title: 'Audio published successfully!' });
          onAudioPublished();
          onClose();
          URL.revokeObjectURL(audio.src);
        };
      } catch (error: any) {
        toast({ title: 'Failed to publish audio', description: error.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-border/80 bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>Publish Royalty-Free Audio</DialogTitle>
          <DialogDescription>Contribute a track to the public library. Once published, it cannot be removed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center ${isDragActive ? 'border-accent bg-accent/10' : 'border-border bg-secondary/30'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
            {audioFile ? <p>{audioFile.name}</p> : <p>Drag 'n' drop an MP3 file here, or click to select file</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 bg-background/80" />
            </div>
            <div>
              <Label htmlFor="artist">Artist</Label>
              <Input id="artist" value={artist} onChange={(event) => setArtist(event.target.value)} className="mt-1 bg-background/80" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="genre">Genre</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger id="genre" className="mt-1 w-full bg-background/80">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                  <SelectItem value="Chill">Chill</SelectItem>
                  <SelectItem value="Upbeat">Upbeat</SelectItem>
                  <SelectItem value="Tropical">Tropical</SelectItem>
                  <SelectItem value="Cinematic">Cinematic</SelectItem>
                  <SelectItem value="Electronic">Electronic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mood">Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger id="mood" className="mt-1 w-full bg-background/80">
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                  <SelectItem value="Relaxing">Relaxing</SelectItem>
                  <SelectItem value="Energetic">Energetic</SelectItem>
                  <SelectItem value="Fun">Fun</SelectItem>
                  <SelectItem value="Epic">Epic</SelectItem>
                  <SelectItem value="Happy">Happy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !audioFile || !title || !artist || !genre || !mood}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 animate-spin" /> Publishing...
              </>
            ) : (
              'Publish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AudioLibraryPageClient({
  initialTracks,
  hasInitialData = false,
}: {
  initialTracks: AudioTrack[];
  hasInitialData?: boolean;
}) {
  const cachedTracks = useStudioStore((state) => state.studioLibrary);
  const setStudioLibraryCache = useStudioStore((state) => state.setStudioLibraryCache);
  const libraryFilters = useStudioStore((state) => state.libraryFilters);
  const setLibraryFilters = useStudioStore((state) => state.setLibraryFilters);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(initialTracks);
  const [loading, setLoading] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const consumedInitialRef = useRef(hasInitialData);
  const { toast } = useToast();

  useEffect(() => {
    if (consumedInitialRef.current) {
      setStudioLibraryCache(initialTracks);
      setAudioTracks(initialTracks);
      setLoading(false);
      consumedInitialRef.current = false;
      return;
    }

    if (cachedTracks.loaded && cachedTracks.data) {
      setAudioTracks(cachedTracks.data);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    trackGlobalForegroundTask(getAudioTracks())
      .then((tracks) => {
        if (!active) {
          return;
        }
        setAudioTracks(tracks);
        setStudioLibraryCache(tracks);
      })
      .finally(() => setLoading(false));

    return () => {
      active = false;
    };
  }, [cachedTracks.data, cachedTracks.loaded, hasInitialData, initialTracks, setStudioLibraryCache]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playPauseTrack = (url: string) => {
    if (currentlyPlaying === url) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const newAudio = new Audio(url);
    audioRef.current = newAudio;
    setCurrentlyPlaying(url);

    const onCanPlay = () => {
      newAudio.play().catch((error) => {
        console.error('Playback failed:', error);
        setCurrentlyPlaying(null);
      });
    };

    const onEnded = () => {
      setCurrentlyPlaying(null);
    };

    newAudio.addEventListener('canplaythrough', onCanPlay, { once: true });
    newAudio.addEventListener('ended', onEnded, { once: true });
  };

  const handleDownload = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok.');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', `${title}.mp3`);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed:', error);
      toast({ title: 'Download Failed', description: 'Could not download the audio file.', variant: 'destructive' });
    }
  };

  const genres = useMemo(() => ['All', ...Array.from(new Set(audioTracks.map((track) => track.genre)))], [audioTracks]);
  const moods = useMemo(() => ['All', ...Array.from(new Set(audioTracks.map((track) => track.mood)))], [audioTracks]);

  const filteredTracks = useMemo(() => {
    return audioTracks.filter((track) => {
      const matchesSearch =
        libraryFilters.searchTerm === '' ||
        track.title.toLowerCase().includes(libraryFilters.searchTerm.toLowerCase()) ||
        track.artist.toLowerCase().includes(libraryFilters.searchTerm.toLowerCase());

      const matchesGenre = libraryFilters.genre === 'All' || track.genre === libraryFilters.genre;
      const matchesMood = libraryFilters.mood === 'All' || track.mood === libraryFilters.mood;

      return matchesSearch && matchesGenre && matchesMood;
    });
  }, [audioTracks, libraryFilters.genre, libraryFilters.mood, libraryFilters.searchTerm]);

  return (
    <div className="text-foreground">
      <PublishAudioDialog
        isOpen={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        onAudioPublished={() => {
          trackGlobalForegroundTask(getAudioTracks(), 'silent').then((tracks) => {
            setAudioTracks(tracks);
            setStudioLibraryCache(tracks);
          });
        }}
      />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audio Library</h1>
          <p className="text-muted-foreground">Find the perfect music for your next video. All tracks are royalty-free.</p>
        </div>
        <Button onClick={() => setIsPublishDialogOpen(true)}>
          <UploadCloud className="mr-2" />
          Publish Audio
        </Button>
      </div>

      <div className="app-panel mb-6 flex flex-col gap-4 p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search music"
            className="w-full bg-background/80 pl-10"
            value={libraryFilters.searchTerm}
            onChange={(event) => setLibraryFilters({ searchTerm: event.target.value })}
          />
        </div>
        <div className="flex gap-4">
          <Select value={libraryFilters.genre} onValueChange={(value) => setLibraryFilters({ genre: value })}>
            <SelectTrigger className="w-full bg-background/80 md:w-[180px]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent className="border-border/80 bg-popover text-popover-foreground">
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={libraryFilters.mood} onValueChange={(value) => setLibraryFilters({ mood: value })}>
            <SelectTrigger className="w-full bg-background/80 md:w-[180px]">
              <SelectValue placeholder="Mood" />
            </SelectTrigger>
            <SelectContent className="border-border/80 bg-popover text-popover-foreground">
              {moods.map((mood) => (
                <SelectItem key={mood} value={mood}>
                  {mood}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="app-panel overflow-hidden">
        <Table>
          <TableHeader className="hover:bg-transparent">
            <TableRow className="border-b-border/80">
              <TableHead className="w-12" />
              <TableHead>Track title</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Mood</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                  Loading audio library...
                </TableCell>
              </TableRow>
            ) : filteredTracks.length > 0 ? (
              filteredTracks.map((track) => (
                <TableRow key={track.id} className="border-b-border/40 hover:bg-secondary/50">
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={() => playPauseTrack(track.url)}>
                      {currentlyPlaying === track.url ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{track.title}</TableCell>
                  <TableCell>{track.artist}</TableCell>
                  <TableCell>{track.genre}</TableCell>
                  <TableCell>{track.mood}</TableCell>
                  <TableCell className="text-right">{track.duration}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" className="text-accent hover:bg-accent/10 hover:text-accent" onClick={() => handleDownload(track.url, track.title)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-16">
                  <EmptyState
                    icon={Music}
                    title="No tracks found"
                    description="Try adjusting your filters or publish a track to build your music library."
                    compact
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
