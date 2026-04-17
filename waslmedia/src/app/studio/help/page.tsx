'use client';

import { useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { HelpCircle, Search } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

const faqItems = [
  {
    question: 'How do I upload a video?',
    answer:
      "Use the Create button in Studio, then choose Upload video. You'll be able to add details, thumbnails, visibility, and publish settings before it goes live.",
  },
  {
    question: 'How do I customize my channel?',
    answer:
      "Open Studio and go to Customisation. From there you can update your name, handle, description, profile picture, and banner without leaving Studio.",
  },
  {
    question: 'Where can I see video analytics?',
    answer:
      'Open Studio Analytics for channel-level metrics, or open a specific item from Content to see detailed analytics for that video or Short.',
  },
  {
    question: 'How do I manage comments and community posts?',
    answer:
      'Use the Community section in Studio. You can review published comments, publish posts, manage polls, and keep audience conversations organized from there.',
  },
];

export default function StudioHelpPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return faqItems;
    }

    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(normalized) || item.answer.toLowerCase().includes(normalized)
    );
  }, [searchTerm]);

  return (
    <div className="mx-auto max-w-4xl text-foreground">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
          <HelpCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Studio help</h1>
        <p className="mt-2 text-muted-foreground">
          Creator help, publishing guidance, and Studio workflow answers without leaving Studio.
        </p>
        <div className="relative mx-auto mt-6 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search Studio help"
            className="pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      {filteredFaqs.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-3">
          {filteredFaqs.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`studio-help-${index}`}
              className="app-panel rounded-2xl border border-border/80 px-5"
            >
              <AccordionTrigger className="text-left hover:no-underline">{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <EmptyState
          icon={HelpCircle}
          title="No help results found"
          description="Try a different keyword or browse the Studio sections directly from the sidebar."
          compact
        />
      )}
    </div>
  );
}
