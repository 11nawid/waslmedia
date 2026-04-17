

'use client';

import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { FeedbackForm } from '@/components/feedback-form';
import Link from 'next/link';

function MainContent({children}: {children: React.ReactNode}) {
  return (
     <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-secondary/30 pb-20">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
    const { user } = useAuth();
    
    if (!user) {
        return (
            <MainContent>
                 <div className="flex flex-col items-center justify-center h-full text-center">
                    <h2 className="text-2xl font-bold">Please sign in</h2>
                    <p className="text-muted-foreground mt-2">You need to be signed in to send feedback.</p>
                    <Button asChild className="mt-4"><Link href="/login">Sign in</Link></Button>
                </div>
            </MainContent>
        )
    }

    return (
        <MainContent>
            <div className="max-w-2xl mx-auto">
                <FeedbackForm
                  title="Send feedback"
                  description="Share ideas, report bugs, or attach a support file under 10 MB so we can investigate faster."
                />
            </div>
        </MainContent>
    )
}
