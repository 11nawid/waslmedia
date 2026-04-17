
'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, PlaySquare, History, ThumbsUp, Brush, ChevronRight, Settings, HelpCircle, MessageSquareWarning, Moon, Globe, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from "next-themes";
import { useLocationStore } from '@/hooks/use-location-store';
import { WaslmediaLogo } from '@/components/waslmedia-logo';
import { useState } from 'react';
import { AppearanceSheet, LocationSheet } from '@/components/settings-sheets';
import { logoutUser } from '@/lib/auth/client';
import { useProgressRouter } from '@/hooks/use-progress-router';

function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20">
          {children}
        </main>
      </div>
    </div>
  );
}

function DataCard({ title, href, icon: Icon, onClick, children }: { title: string; href?: string; icon: React.ElementType, onClick?: () => void, children?: React.ReactNode }) {
    const content = (
        <div className="flex items-center gap-4">
            <Icon className="w-6 h-6 text-muted-foreground" />
            <span className="flex-1 text-base">{title}</span>
            {children || <ChevronRight className="w-5 h-5 text-muted-foreground" />}
        </div>
    )

  if (href) {
    return (
        <Link href={href} className="block group p-4 hover:bg-secondary/50 rounded-lg transition-colors">
            {content}
        </Link>
    )
  }

  return (
      <button onClick={onClick} className="block w-full text-left group p-4 hover:bg-secondary/50 rounded-lg transition-colors">
        {content}
      </button>
  )
}

export default function YourDataPage() {
  const { user, userChannelLink } = useAuth();
  const { theme } = useTheme();
  const { location } = useLocationStore();
  const router = useProgressRouter();
  
  const [isAppearanceSheetOpen, setIsAppearanceSheetOpen] = useState(false);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);


  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  if (!user) {
    return (
      <MainContent>
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Shield className="w-24 h-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold">Sign in to manage your data</h2>
          <p className="text-muted-foreground mt-2">To access your data and activity controls, please sign in.</p>
          <Button asChild className="mt-4"><Link href="/login">Sign in</Link></Button>
        </div>
      </MainContent>
    );
  }

  return (
    <MainContent>
       <AppearanceSheet isOpen={isAppearanceSheetOpen} onOpenChange={setIsAppearanceSheetOpen} />
       <LocationSheet isOpen={isLocationSheetOpen} onOpenChange={setIsLocationSheetOpen} />

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href={userChannelLink}>
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ''} />
              <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{user.displayName}</h1>
            <p className="text-muted-foreground">{user.email}</p>
             <Link href={userChannelLink} className="text-sm text-accent mt-1 block">View your channel</Link>
          </div>
        </div>

        <Separator />

        <section className="my-6 space-y-1">
          <h2 className="text-xl font-semibold mb-2 px-4">Your Activity</h2>
            <DataCard
              title="History"
              href="/history"
              icon={History}
            />
            <DataCard
              title="Playlists"
              href="/playlists"
              icon={PlaySquare}
            />
             <DataCard
              title="Liked Videos"
              href="/liked"
              icon={ThumbsUp}
            />
        </section>

        <Separator />

        <section className="my-6 space-y-1">
            <DataCard
              title="Waslmedia Studio"
              href="/studio"
              icon={WaslmediaLogo}
            />
        </section>

        <Separator />

         <section className="my-6 space-y-1">
             <DataCard
              title="Appearance"
              onClick={() => setIsAppearanceSheetOpen(true)}
              icon={Moon}
            >
                <span className="text-muted-foreground capitalize">{theme} <ChevronRight className="w-5 h-5 inline-block" /></span>
             </DataCard>
             <DataCard
              title="Location"
              onClick={() => setIsLocationSheetOpen(true)}
              icon={Globe}
            >
                <span className="text-muted-foreground">{location} <ChevronRight className="w-5 h-5 inline-block" /></span>
            </DataCard>
             <DataCard
              title="Help"
              href="/help-center"
              icon={HelpCircle}
            />
             <DataCard
              title="Send feedback"
              href="/feedback"
              icon={MessageSquareWarning}
            />
        </section>
        
        <Separator />

        <section className="my-6">
             <DataCard
              title="Sign out"
              onClick={handleLogout}
              icon={LogOut}
            />
        </section>

      </div>
    </MainContent>
  );
}
