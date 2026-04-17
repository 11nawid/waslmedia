
'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth';
import type { Channel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { debounce } from 'lodash';
import { Info, Copy } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries } from '@/lib/countries';
import { DEFAULT_BANNER, DEFAULT_PROFILE_PICTURE } from '@/lib/auth/constants';
import { getOwnChannelSettings, isHandleAvailable, updateOwnChannelSettings } from '@/lib/studio/client';
import { useStudioStore } from '@/hooks/use-studio-store';
import { buildChannelHref } from '@/lib/channel-links';
import { useProgressRouter } from '@/hooks/use-progress-router';
import { SecureImage } from '@/components/channel-page-primitives';

const customisationSchema = z.object({
  name: z.string().min(3, 'Channel name must be at least 3 characters.'),
  handle: z.string().min(3, 'Handle must be at least 3 characters.').regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores.'),
  profilePicture: z.any().optional(),
  bannerImage: z.any().optional(),
  description: z.string().max(1000, 'Description must be 1000 characters or less.').optional(),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  country: z.string().optional(),
  showCountry: z.boolean().optional(),
});

type CustomisationSchema = z.infer<typeof customisationSchema>;

export default function CustomisationPage() {
  const { user, refreshAuth } = useAuth();
  const { toast } = useToast();
  const router = useProgressRouter();
  const cachedCustomisation = useStudioStore((state) => state.customisation);
  const setCustomisationCache = useStudioStore((state) => state.setCustomisationCache);
  const [channel, setChannel] = useState<Channel | null>(cachedCustomisation.data as Channel | null);
  const [loading, setLoading] = useState(!cachedCustomisation.loaded);
  const [isPending, startTransition] = useTransition();

  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isDirty }, control, setValue, watch, reset } = useForm<CustomisationSchema>({
    resolver: zodResolver(customisationSchema),
  });

  const currentHandle = watch('handle');

  const checkHandle = useCallback(debounce(async (handle: string, originalHandle: string) => {
    if (!handle || handle.length < 3 || handle === originalHandle) {
      return;
    }
    const available = await isHandleAvailable(handle);
    if (!available) {
      toast({ title: 'Handle not available', variant: 'destructive' });
    }
  }, 500), [toast]);


  useEffect(() => {
    if (currentHandle && channel?.handle) {
      checkHandle(currentHandle, channel.handle.substring(1));
    }
  }, [currentHandle, checkHandle, channel]);

  useEffect(() => {
    if (cachedCustomisation.data) {
      const channelData = cachedCustomisation.data;
      setChannel(channelData as Channel);
      reset({
        name: channelData.name,
        handle: channelData.handle.substring(1),
        description: channelData.description,
        email: channelData.email,
        country: channelData.country || '',
        showCountry: channelData.showCountry || false,
      });
      setBannerPreview(channelData.bannerUrl);
      setProfilePreview(channelData.profilePictureUrl);
      setLoading(false);
    }
  }, [cachedCustomisation.data, reset]);

  useEffect(() => {
    if (user) {
      getOwnChannelSettings().then(channelData => {
        if (channelData) {
          setChannel(channelData as Channel);
          setCustomisationCache(channelData);
          reset({
            name: channelData.name,
            handle: channelData.handle.substring(1),
            description: channelData.description,
            email: channelData.email,
            country: channelData.country || '',
            showCountry: channelData.showCountry || false,
          });
          setBannerPreview(channelData.bannerUrl);
          setProfilePreview(channelData.profilePictureUrl);
        }
        setLoading(false);
      }).finally(() => setLoading(false));
    }
  }, [reset, setCustomisationCache, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'profilePicture' | 'bannerImage') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setValue(field, file, { shouldDirty: true });
      if (field === 'profilePicture') {
        setProfilePreview(URL.createObjectURL(file));
      } else {
        setBannerPreview(URL.createObjectURL(file));
      }
    }
  };
  
  const handleRemoveImage = (field: 'profilePicture' | 'bannerImage') => {
      setValue(field, null, { shouldDirty: true });
      if(field === 'profilePicture') {
          setProfilePreview(DEFAULT_PROFILE_PICTURE);
      } else {
          setBannerPreview(DEFAULT_BANNER);
      }
  }

  const onSubmit = (data: CustomisationSchema) => {
    if (!user || !channel) return;
    startTransition(async () => {
      try {
        const updatedChannel = await updateOwnChannelSettings(data);
        setCustomisationCache(updatedChannel);
        setChannel(updatedChannel as Channel);
        await refreshAuth();
        toast({ title: 'Channel updated successfully!' });
        reset(data); // to reset dirty state
      } catch (error: any) {
        console.error("Failed to update channel:", error);
        toast({ title: 'Failed to update channel', description: "An unexpected error occurred. Please try again.", variant: 'destructive' });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({title: 'Copied to clipboard!'});
  }

  const preferredChannelUrl = channel ? `${window.location.origin}${buildChannelHref(channel.handle || channel.id)}` : '';
  const fallbackChannelUrl = channel ? `${window.location.origin}/channel/${channel.id}` : '';

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Channel customisation</h1>
        <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => router.push(buildChannelHref(channel?.handle || channel?.id))}>View channel</Button>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => reset()} disabled={!isDirty}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isPending || !isDirty}>
                {isPending ? 'Publishing...' : 'Publish'}
            </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="border p-4 md:p-6 rounded-md">
            <h2 className="text-lg font-semibold">Banner image</h2>
            <p className="text-sm text-muted-foreground mb-4">This image will appear across the top of your channel.</p>
            <div className="flex flex-col md:flex-row items-center gap-8">
                 <div className="w-full md:w-1/2">
                    <div className="aspect-[16/9] bg-secondary flex items-center justify-center rounded-md overflow-hidden">
                        {bannerPreview ? (
                            <SecureImage
                                src={bannerPreview}
                                alt="Banner Preview"
                                className="h-full w-full object-cover"
                                fallbackClassName="h-full w-full"
                            />
                        ) : (
                            <div className="h-full w-full bg-secondary/40" />
                        )}
                    </div>
                </div>
                <div className="w-full md:w-1/2">
                    <p className="text-xs text-muted-foreground">For the best results on all devices, use an image that's at least 2048 x 1152 pixels and 6 MB or less.</p>
                     <div className="flex gap-2 mt-4">
                        <Controller
                            control={control}
                            name="bannerImage"
                            render={({ field }) => (
                                <>
                                 <Button asChild variant="outline">
                                    <label htmlFor="banner-upload">Change</label>
                                </Button>
                                <input id="banner-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'bannerImage')} />
                                </>
                            )}
                        />
                        <Button variant="outline" onClick={() => handleRemoveImage('bannerImage')}>Remove</Button>
                    </div>
                </div>
            </div>
        </div>
        
         <div className="border p-4 md:p-6 rounded-md">
            <h2 className="text-lg font-semibold">Picture</h2>
            <p className="text-sm text-muted-foreground mb-4">Your profile picture will appear where your channel is presented on RiseMedia, such as next to your videos and comments.</p>
             <div className="flex flex-col md:flex-row items-center gap-8">
                 <div className="w-full md:w-1/2 flex justify-center">
                    <Avatar className="w-40 h-40">
                      <AvatarImage src={profilePreview || DEFAULT_PROFILE_PICTURE} alt="Profile Preview" data-ai-hint="profile avatar" />
                      <AvatarFallback>{channel?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="w-full md:w-1/2">
                    <p className="text-xs text-muted-foreground">It's recommended that you use a picture that's at least 98 x 98 pixels and 4 MB or less. Use a PNG or GIF (no animations) file. Make sure that your picture follows the RiseMedia Community Guidelines.</p>
                     <div className="flex gap-2 mt-4">
                        <Controller
                            control={control}
                            name="profilePicture"
                            render={({ field }) => (
                                <>
                                <Button asChild variant="outline">
                                    <label htmlFor="profile-upload">Change</label>
                                </Button>
                                <input id="profile-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profilePicture')} />
                                </>
                            )}
                        />
                        <Button variant="outline" onClick={() => handleRemoveImage('profilePicture')}>Remove</Button>
                    </div>
                </div>
            </div>
        </div>

        <div className="border p-4 md:p-6 rounded-md space-y-6">
           <div>
            <h2 className="text-lg font-semibold">Name</h2>
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">Choose a channel name that represents you and your content. Changes made to your name and picture are only visible on RiseMedia and not on other Google services. You can change your name twice in 14 days. <Info className="w-4 h-4" /></p>
             <Input {...register('name')} />
             {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
           </div>

           <div>
                <h2 className="text-lg font-semibold">Handle</h2>
                <p className="text-sm text-muted-foreground mb-2">Choose your unique handle by adding letters and numbers. You can change your handle back within 14 days. Handles can be changed twice every 14 days.</p>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input {...register('handle')} className="pl-6" />
                </div>
                {errors.handle && <p className="text-red-500 text-sm mt-1">{errors.handle.message}</p>}
           </div>

            <div>
                <h2 className="text-lg font-semibold">Description</h2>
                <Textarea {...register('description')} className="mt-2" rows={5} placeholder="Tell viewers about your channel. Your description will appear in the About tab of your channel page and in search results, among other places." />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>

            <div>
                <h2 className="text-lg font-semibold">Location</h2>
                <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {countries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                <div className="flex items-center space-x-2 mt-4">
                    <Controller
                        name="showCountry"
                        control={control}
                        render={({ field }) => (
                            <Checkbox 
                                id="showCountry" 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                    <Label htmlFor="showCountry">Show country in the About tab</Label>
                </div>
            </div>

             <div>
                <h2 className="text-lg font-semibold">Channel URL</h2>
                <p className="text-sm text-muted-foreground mb-2">This is the standard web address for your channel. It includes your unique channel ID, which is the numbers and letters at the end of the URL.</p>
                <div className="relative">
                    <Input readOnly value={preferredChannelUrl || fallbackChannelUrl} className="pr-10" />
                     <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => copyToClipboard(preferredChannelUrl || fallbackChannelUrl)}>
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
           </div>

            <div>
                <h2 className="text-lg font-semibold">Contact info</h2>
                 <p className="text-sm text-muted-foreground mb-2">Let people know how to contact you with business enquiries. The email address that you enter may appear in the About section of your channel and be visible to viewers.</p>
                <Input {...register('email')} placeholder="Email" />
                 {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
           </div>
        </div>
      </div>
      <div className="mt-8 md:hidden">
          <Button type="submit" variant="primary" className="w-full" disabled={isPending || !isDirty}>
                {isPending ? 'Publishing...' : 'Publish'}
            </Button>
      </div>
    </form>
  );
}
