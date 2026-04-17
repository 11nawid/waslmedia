'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Filter, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getRecentSubscribers } from '@/lib/data';
import type { Channel, PageInfo } from '@/lib/types';
import { useRecentSubscribersDialog } from '@/hooks/use-recent-subscribers-dialog-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildChannelHref } from '@/lib/channel-links';

const PAGE_SIZE_OPTIONS = [
  { value: 20, label: '20 per page' },
  { value: 40, label: '40 per page' },
  { value: 60, label: '60 per page' },
] as const;

const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'largest', label: 'Largest channels' },
] as const;

function RecentSubscribersSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between border-b border-border/60 bg-background px-4 py-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function formatSubscriberCount(count: number) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M subscribers`;
  if (count >= 1000) return `${Math.floor(count / 1000)}K subscribers`;
  return `${count} subscribers`;
}

function formatRelativeSubscriptionDate(value?: string) {
  if (!value) {
    return 'Subscribed recently';
  }

  try {
    return `Subscribed ${formatDistanceToNow(new Date(value), { addSuffix: true })}`;
  } catch {
    return 'Subscribed recently';
  }
}

function SubscriberTableRow({ subscriber }: { subscriber: Channel }) {
  const channelHref = buildChannelHref(subscriber.handle || subscriber.id);

  return (
    <TableRow className="border-b-border/40 hover:bg-secondary/35">
      <TableCell className="min-w-[280px]">
        <div className="flex items-center gap-4">
          <Link href={channelHref} className="shrink-0">
            <Avatar className="h-12 w-12 border border-border/60">
              <AvatarImage src={subscriber.profilePictureUrl} alt={subscriber.name} data-ai-hint="subscriber avatar" />
              <AvatarFallback>{subscriber.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link href={channelHref} className="block truncate text-sm font-semibold text-foreground hover:underline">
              {subscriber.name}
            </Link>
            <p className="truncate text-sm text-muted-foreground">{subscriber.handle}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatSubscriberCount(subscriber.subscriberCount)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatRelativeSubscriptionDate(subscriber.recentSubscriptionAt)}</TableCell>
      <TableCell className="w-[140px] text-right">
        <Button asChild variant="ghost" className="rounded-full px-4 text-foreground hover:bg-secondary">
          <Link href={channelHref}>View channel</Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function RecentSubscribersDialog() {
  const { isOpen, onClose } = useRecentSubscribersDialog();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState<Channel[]>([]);
  const [pagination, setPagination] = useState<PageInfo>({
    total: 0,
    limit: 20,
    offset: 0,
    count: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'largest'>('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setPage(1);
      setPageSize(20);
      setSortBy('recent');
      return;
    }

    if (!user) {
      return;
    }

    setLoading(true);
    getRecentSubscribers(user.uid, {
      count: pageSize,
      offset: (page - 1) * pageSize,
      sort: sortBy,
    })
      .then((payload) => {
        setSubscribers(payload.channels);
        setPagination(payload.pagination);
      })
      .finally(() => setLoading(false));
  }, [isOpen, page, pageSize, sortBy, user]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, sortBy, searchTerm]);

  const filteredSubscribers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return subscribers;
    }

    return subscribers.filter((subscriber) => {
      return (
        subscriber.name.toLowerCase().includes(normalized) ||
        subscriber.handle.toLowerCase().includes(normalized)
      );
    });
  }, [searchTerm, subscribers]);

  const offset = pagination.offset ?? 0;
  const startIndex = offset > 0 ? offset + 1 : filteredSubscribers.length > 0 ? 1 : 0;
  const endIndex = offset + filteredSubscribers.length;
  const total = pagination.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  const controls = (
    <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Browse active subscribers</p>
        <p className="text-sm text-muted-foreground">
          {total > 0 ? `${startIndex}-${endIndex} of ${total}` : 'No subscribers yet'}
        </p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative min-w-[220px]">
          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Filter this page"
            className="h-10 border-border/70 bg-background pl-10"
          />
        </div>
        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
          <SelectTrigger className="h-10 w-full bg-background md:w-[150px]">
            <SelectValue placeholder="Show" />
          </SelectTrigger>
          <SelectContent className="border-border/80 bg-popover text-popover-foreground">
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'recent' | 'oldest' | 'largest')}>
          <SelectTrigger className="h-10 w-full bg-background md:w-[180px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent className="border-border/80 bg-popover text-popover-foreground">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const desktopTable = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card">
      {controls}
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="hover:bg-transparent">
              <TableRow className="border-b-border/80">
                <TableHead>Subscriber</TableHead>
                <TableHead>Total subscribers</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-0">
                    <RecentSubscribersSkeleton />
                  </TableCell>
                </TableRow>
              ) : filteredSubscribers.length > 0 ? (
                filteredSubscribers.map((subscriber) => <SubscriberTableRow key={subscriber.id} subscriber={subscriber} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <p className="text-base font-medium text-foreground">No subscribers found on this page.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Try another filter or move to a different page.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-end md:gap-5">
        <div>
          {startIndex}-{endIndex} of {total}
        </div>
        <div className="min-w-[84px] text-left md:text-right">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            disabled={loading || page <= 1}
            onClick={() => setPage(1)}
            aria-label="First page"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-3"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-3"
            disabled={loading || !pagination.hasNextPage}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            disabled={loading || !pagination.hasNextPage}
            onClick={() => setPage(totalPages)}
            aria-label="Last page"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-5">
      {controls}
      <div className="space-y-3">
        {loading ? (
          <RecentSubscribersSkeleton />
        ) : filteredSubscribers.length > 0 ? (
          filteredSubscribers.map((subscriber) => {
            const channelHref = buildChannelHref(subscriber.handle || subscriber.id);
            return (
              <div key={subscriber.id} className="rounded-[24px] border border-border/70 bg-card p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border border-border/60">
                    <AvatarImage src={subscriber.profilePictureUrl} alt={subscriber.name} />
                    <AvatarFallback>{subscriber.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link href={channelHref} className="block truncate text-sm font-semibold text-foreground hover:underline">
                      {subscriber.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">{subscriber.handle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatRelativeSubscriptionDate(subscriber.recentSubscriptionAt)}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{formatSubscriberCount(subscriber.subscriberCount)}</span>
                  <Button asChild variant="secondary" className="rounded-full px-4">
                    <Link href={channelHref}>View channel</Link>
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[24px] border border-dashed border-border/70 bg-card px-5 py-12 text-center">
            <p className="text-base font-medium text-foreground">No subscribers found on this page.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try another filter or move to a different page.</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border/70 pt-4">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            disabled={loading || !pagination.hasNextPage}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="rounded-t-[28px] bg-background">
          <DrawerHeader className="border-b border-border/70 text-left">
            <DrawerTitle className="text-xl">Recent subscribers</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="p-4">{mobileContent}</div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[min(78vh,760px)] max-h-[78vh] flex-col overflow-hidden rounded-[28px] border border-border/80 bg-background text-foreground shadow-[0_28px_90px_-48px_rgba(15,23,42,0.45)] sm:max-w-5xl">
        <DialogHeader className="border-b border-border/70 pb-4">
          <DialogTitle className="text-2xl font-semibold">Recent subscribers</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 pt-1">{desktopTable}</div>
      </DialogContent>
    </Dialog>
  );
}
