

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useTransition } from 'react';
import { getUploadDefaults, updateUploadDefaults } from '@/lib/studio/client';
import { useLanguageStore } from '@/hooks/use-language-store';

const uploadDefaultsSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    visibility: z.enum(['private', 'public', 'unlisted']).default('private'),
    tags: z.string().optional(),
    category: z.string().optional(),
});

type UploadDefaultsSchema = z.infer<typeof uploadDefaultsSchema>;


const categories = [
    "Film & Animation", "Autos & Vehicles", "Music", "Pets & Animals", 
    "Sports", "Travel & Events", "Gaming", "People & Blogs", "Comedy",
    "Entertainment", "News & Politics", "Howto & Style", "Education",
    "Science & Technology", "Nonprofits & Activism"
];


export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const { language, setLanguage, t } = useLanguageStore();

    const { control, register, handleSubmit, reset, formState: { isDirty } } = useForm<UploadDefaultsSchema>({
        resolver: zodResolver(uploadDefaultsSchema),
        defaultValues: {
            title: '',
            description: '',
            visibility: 'private',
            tags: '',
            category: '',
        }
    });

    useEffect(() => {
        if(user) {
            getUploadDefaults().then(defaults => {
                if (defaults) {
                    reset(defaults);
                }
            })
        }
    }, [user, reset]);

    const onSubmit = (data: UploadDefaultsSchema) => {
        if (!user) return;
        
        const payload = {
            title: data.title || '',
            description: data.description || '',
            visibility: data.visibility || 'private',
            tags: data.tags || '',
            category: data.category || '',
        };

        startTransition(async () => {
             try {
                await updateUploadDefaults(payload);
                toast({
                    title: "Settings Saved",
                    description: "Your new settings have been applied.",
                });
                reset(payload);
            } catch (error: any) {
                 console.error("Error saving settings", error);
                toast({
                    title: "Error saving settings",
                    description: "There was a problem saving your settings.",
                    variant: 'destructive',
                });
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
                <div className="flex gap-2">
                    <Button variant="ghost" className="text-muted-foreground hover:text-foreground" type="button" onClick={() => reset()} disabled={!isDirty || isPending}>{t('settings.cancel')}</Button>
                    <Button variant="primary" type="submit" disabled={!isDirty || isPending}>
                        {isPending ? t('settings.saving') : t('settings.save')}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="upload-defaults" className="w-full">
                <TabsList className="mb-6 gap-6 rounded-none border-b border-border/80 bg-transparent p-0">
                    <TabsTrigger value="general" className="rounded-none border-foreground py-3 text-base text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:shadow-none">{t('settings.general.title')}</TabsTrigger>
                    <TabsTrigger value="upload-defaults" className="rounded-none border-foreground py-3 text-base text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:shadow-none">{t('settings.uploadDefaults.title')}</TabsTrigger>
                    <TabsTrigger value="community" className="rounded-none border-foreground py-3 text-base text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:text-foreground data-[state=active]:shadow-none">{t('settings.community.title')}</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card className="bg-transparent border-none">
                        <CardHeader>
                            <CardTitle>{t('settings.general.title')}</CardTitle>
                            <CardDescription>{t('settings.general.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="w-full max-w-sm">
                                <Label htmlFor="language">{t('settings.general.language')}</Label>
                                <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'es')}>
                                    <SelectTrigger id="language" className="mt-2 w-full bg-background/80">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                                        <SelectItem value="en">English (United States)</SelectItem>
                                        <SelectItem value="es">Español</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="upload-defaults">
                     <Card className="bg-transparent border-none">
                        <CardHeader>
                            <CardTitle>{t('settings.uploadDefaults.title')}</CardTitle>
                            <CardDescription>{t('settings.uploadDefaults.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="default-title">{t('settings.uploadDefaults.defaultTitle')}</Label>
                                <Input id="default-title" {...register('title')} className="mt-2 bg-background/80" placeholder="Add a title that describes your video" />
                            </div>
                             <div>
                                <Label htmlFor="default-desc">{t('settings.uploadDefaults.defaultDescription')}</Label>
                                <Textarea id="default-desc" {...register('description')} className="mt-2 bg-background/80" rows={5} placeholder="Tell viewers about your video" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label htmlFor="default-visibility">{t('settings.uploadDefaults.defaultVisibility')}</Label>
                                    <Controller
                                        name="visibility"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger id="default-visibility" className="mt-2 w-full bg-background/80">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                                                    <SelectItem value="public">{t('visibility.public')}</SelectItem>
                                                    <SelectItem value="private">{t('visibility.private')}</SelectItem>
                                                    <SelectItem value="unlisted">{t('visibility.unlisted')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                 <div>
                                    <Label htmlFor="default-category">{t('settings.uploadDefaults.defaultCategory')}</Label>
                                    <Controller
                                        name="category"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger id="default-category" className="mt-2 w-full bg-background/80">
                                                    <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60 border-border/80 bg-popover text-popover-foreground">
                                                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                             <div>
                                <Label htmlFor="default-tags">{t('settings.uploadDefaults.defaultTags')}</Label>
                                <Input id="default-tags" {...register('tags')} className="mt-2 bg-background/80" placeholder="Add tags separated by commas" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                 <TabsContent value="community">
                      <Card className="bg-transparent border-none">
                        <CardHeader>
                            <CardTitle>{t('settings.community.title')}</CardTitle>
                            <CardDescription>{t('settings.community.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label>{t('settings.community.commentsOnNewVideos')}</Label>
                                <Select defaultValue="hold">
                                    <SelectTrigger className="mt-2 w-full max-w-sm bg-background/80">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                                        <SelectItem value="allow">{t('settings.community.allowAll')}</SelectItem>
                                        <SelectItem value="hold">{t('settings.community.holdPotentiallyInappropriate')}</SelectItem>
                                        <SelectItem value="disable">{t('settings.community.disable')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </form>
    );
}
