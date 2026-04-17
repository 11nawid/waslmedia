'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { FeedbackForm } from '@/components/feedback-form';

export default function StudioFeedbackPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Sign in required</CardTitle>
          <CardDescription>You need to be signed in to send Studio feedback.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <FeedbackForm
        title="Send Studio feedback"
        description="Report bugs, creator workflow issues, or product ideas. You can also attach one support file under 10 MB."
      />
    </div>
  );
}
