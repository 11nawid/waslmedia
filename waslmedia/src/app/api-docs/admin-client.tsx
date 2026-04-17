'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { AlertCircle, ArrowUpRight, BarChart3, Building2, CheckCircle2, Clock3, Code2, Coins, Eye, FileVideo, LayoutDashboard, LoaderCircle, LogOut, Megaphone, MessageSquare, MousePointerClick, PauseCircle, PlayCircle, Search, Settings2, Shield, UserCog, Users, Wallet, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ADMIN_PERMISSION_LABELS, ADMIN_ROLES, ADMIN_SECTION_DEFINITIONS } from '@/lib/admin/rbac';
import type { AdminPermission, AdminPermissionEffect, AdminRole, AdminSectionId, AdminStaffAccount, AdminViewer } from '@/lib/admin/types';
import { AD_NOTIFY_MODE_LABELS, AD_REJECTION_REASON_LABELS } from '@/lib/ads/constants';
import { reviewAdminAdCampaignClient } from '@/lib/ads/client';

declare global {
  interface Window {
    SwaggerUIBundle?: (config: Record<string, unknown>) => void;
  }
}

type StaffFormState = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: AdminRole;
  status: 'active' | 'disabled';
  notes: string;
  allowedTags: string[];
  allowedPathPrefixes: string[];
  allowedExactPaths: string[];
  overrides: Partial<Record<AdminPermission, AdminPermissionEffect | ''>>;
};

const DOCS_TAG_OPTIONS = ['auth', 'channels', 'videos', 'comments', 'playlists', 'posts', 'subscriptions', 'studio', 'audio', 'analytics', 'search', 'storage', 'realtime', 'bootstrap'];
const DOCS_PREFIX_OPTIONS = ['/api/auth', '/api/channel', '/api/bootstrap', '/api/videos', '/api/comments', '/api/playlists', '/api/posts', '/api/subscriptions', '/api/audio-tracks', '/api/search', '/api/storage', '/api/realtime'];
const DOCS_EXACT_OPTIONS = ['/api/auth/me', '/api/search', '/api/storage/upload-intent', '/api/realtime', '/api/playlists/status', '/api/videos/watch-later/bulk'];
const NAV_ICONS: Record<AdminSectionId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  'api-docs': Code2,
  staff: UserCog,
  ads: Megaphone,
  users: Users,
  channels: Building2,
  videos: FileVideo,
  comments: MessageSquare,
  posts: Megaphone,
  analytics: BarChart3,
  finance: Coins,
  system: Settings2,
};

function emptyStaffForm(): StaffFormState {
  return { name: '', username: '', email: '', password: '', role: 'developer', status: 'active', notes: '', allowedTags: [], allowedPathPrefixes: [], allowedExactPaths: [], overrides: {} };
}

function toList(event: React.ChangeEvent<HTMLSelectElement>) {
  return Array.from(event.target.selectedOptions, (option) => option.value);
}

function currency(value: unknown) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0) / 100);
}

function dt(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function Card({ title, hint, value }: { title: string; hint: string; value: string | number }) {
  return <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p><p className="mt-3 text-3xl font-semibold text-white">{value}</p><p className="mt-2 text-sm text-slate-400">{hint}</p></div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-10 text-center"><p className="text-lg font-semibold text-white">{title}</p><p className="mt-2 text-sm text-slate-400">{body}</p></div>;
}

function Table({ columns, rows }: { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> }) {
  if (rows.length === 0) return <Empty title="Nothing here yet" body="Records will appear here once data exists for this section." />;
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/60">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-900/90"><tr>{columns.map((column) => <th key={column.key} className="px-4 py-3 text-left text-xs uppercase tracking-[0.18em] text-slate-500">{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-800">{rows.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => <td key={column.key} className="px-4 py-3 text-sm text-slate-200"><div className="max-w-[260px] truncate">{String(row[column.key] ?? '—')}</div></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function getReviewActionState(entry: Record<string, unknown>) {
  const canReview = Boolean(entry.canReview);
  const blockedReason =
    typeof entry.reviewBlockedReason === 'string' && entry.reviewBlockedReason.trim()
      ? entry.reviewBlockedReason
      : null;

  return { canReview, blockedReason };
}

type AdminAdsTabId = 'pending' | 'approved' | 'live' | 'paused' | 'rejected' | 'finished';
type RejectDialogState = {
  campaignId: string;
  title: string;
};

function formatAdminStatus(value: unknown) {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function adminAdsTabDefinitions(campaigns: Array<Record<string, unknown>>) {
  const counts = {
    pending: campaigns.filter((campaign) => String(campaign.review_status) === 'pending').length,
    approved: campaigns.filter((campaign) => String(campaign.review_status) === 'approved').length,
    live: campaigns.filter((campaign) => String(campaign.status) === 'active').length,
    paused: campaigns.filter((campaign) => String(campaign.status) === 'paused').length,
    rejected: campaigns.filter((campaign) => String(campaign.review_status) === 'rejected').length,
    finished: campaigns.filter((campaign) => ['completed', 'archived'].includes(String(campaign.status))).length,
  };

  return [
    { id: 'pending' as const, label: 'Pending ads', count: counts.pending },
    { id: 'approved' as const, label: 'Approved', count: counts.approved },
    { id: 'live' as const, label: 'Live', count: counts.live },
    { id: 'paused' as const, label: 'Paused', count: counts.paused },
    { id: 'rejected' as const, label: 'Rejected', count: counts.rejected },
    { id: 'finished' as const, label: 'Finished', count: counts.finished },
  ];
}

function matchesAdminAdsTab(campaign: Record<string, unknown>, tab: AdminAdsTabId) {
  const status = String(campaign.status || '');
  const reviewStatus = String(campaign.review_status || '');

  switch (tab) {
    case 'pending':
      return reviewStatus === 'pending';
    case 'approved':
      return reviewStatus === 'approved';
    case 'live':
      return status === 'active';
    case 'paused':
      return status === 'paused';
    case 'rejected':
      return reviewStatus === 'rejected';
    case 'finished':
      return status === 'completed' || status === 'archived';
    default:
      return true;
  }
}

function adminAdTone(campaign: Record<string, unknown>) {
  if (String(campaign.status) === 'active') {
    return 'emerald';
  }
  if (String(campaign.review_status) === 'rejected') {
    return 'rose';
  }
  if (String(campaign.review_status) === 'pending') {
    return 'amber';
  }
  if (String(campaign.status) === 'paused') {
    return 'slate';
  }
  return 'blue';
}

function AdminAdPreview({ campaign }: { campaign: Record<string, unknown> }) {
  const title = String(campaign.title || 'Untitled campaign');
  const description = String(campaign.description || '');
  const sponsor = String(campaign.sponsor_name || 'Sponsored');
  const domain = String(campaign.sponsor_domain || 'website.com');
  const cta = String(campaign.cta_label || 'Start now');
  const thumbnailUrl = String(campaign.thumbnail_url || '');

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60">
      <div className="relative aspect-[16/10] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),_transparent_30%),linear-gradient(135deg,#421f7a_0%,#6d28d9_52%,#7c3aed_100%)]">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt={title} fill className="object-cover opacity-80" unoptimized />
        ) : null}
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative flex h-full flex-col justify-between p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/15 bg-black/25 text-sm font-semibold">
                {sponsor.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-[0.26em] text-white/80">Sponsored</p>
                <p className="truncate text-sm font-semibold">{domain}</p>
              </div>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/25">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="line-clamp-2 text-2xl font-black leading-tight">{title}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500 text-sm font-semibold text-white">
            {sponsor.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-lg font-semibold text-white">{title}</p>
            <p className="mt-2 line-clamp-2 text-sm text-slate-400">{description || 'No description provided yet.'}</p>
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-medium text-white">Sponsored</span>
              {' · '}
              {domain}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" className="rounded-full bg-slate-800 text-slate-100 hover:bg-slate-700">Watch</Button>
              <Button className="rounded-full">{cta}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminAdsCampaignCard({
  campaign,
  viewerPermissions,
  onReview,
}: {
  campaign: Record<string, unknown>;
  viewerPermissions: string[];
  onReview: (campaign: Record<string, unknown>, action: 'approved' | 'rejected') => void | Promise<void>;
}) {
  const tone = adminAdTone(campaign);
  const canReview =
    String(campaign.review_status) === 'pending' &&
    String(campaign.payment_status) === 'paid' &&
    String(campaign.status) === 'paid_pending_review';
  const isAnalyticsVisible = ['active', 'paused', 'completed', 'archived'].includes(String(campaign.status));
  const blockedReason =
    String(campaign.review_status) === 'pending'
      ? String(campaign.payment_status) !== 'paid'
        ? 'Waiting for verified payment before review actions are allowed.'
        : String(campaign.status) !== 'paid_pending_review'
          ? `Current status is ${formatAdminStatus(campaign.status)}.`
          : null
      : null;

  const badges = [
    { label: formatAdminStatus(campaign.status), tone },
    { label: `payment ${formatAdminStatus(campaign.payment_status)}`, tone: 'slate' },
    { label: `review ${formatAdminStatus(campaign.review_status)}`, tone: 'slate' },
  ];

  const statCards = isAnalyticsVisible
    ? [
        { label: 'Budget', value: currency(campaign.total_paise ?? campaign.budget_paise), Icon: Wallet },
        { label: 'Spend', value: currency(campaign.spend_paise), Icon: Wallet },
        { label: 'Impressions', value: String(campaign.total_impressions ?? 0), Icon: Eye },
        { label: 'Clicks', value: String(campaign.total_clicks ?? 0), Icon: MousePointerClick },
      ]
    : [
        { label: 'Budget', value: currency(campaign.total_paise ?? campaign.budget_paise), Icon: Wallet },
        { label: 'Destination', value: String(campaign.destination_url || '—'), Icon: ArrowUpRight },
      ];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{String(campaign.title || 'Untitled campaign')}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {String(campaign.sponsor_name || 'Sponsored')} · {formatAdminStatus(campaign.placement_scope || 'both')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                'rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]',
                badge.tone === 'emerald' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                badge.tone === 'amber' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                badge.tone === 'rose' && 'border-rose-500/30 bg-rose-500/10 text-rose-300',
                badge.tone === 'blue' && 'border-sky-500/30 bg-sky-500/10 text-sky-300',
                badge.tone === 'slate' && 'border-slate-700 bg-slate-950/70 text-slate-300'
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminAdPreview campaign={campaign} />
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Created</p>
              <p className="mt-2 text-sm font-medium text-white">{dt(campaign.created_at)}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Run window</p>
              <p className="mt-2 text-sm font-medium text-white">
                {campaign.start_at ? `${dt(campaign.start_at)} → ${dt(campaign.end_at)}` : 'Not scheduled yet'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Destination</p>
              <p className="mt-2 break-all text-sm font-medium text-white">{String(campaign.destination_url || '—')}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map(({ label, value, Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
                <p className="mt-3 text-xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>

          {!isAnalyticsVisible ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
              Analytics and delivery stats stay hidden until the ad is live, paused after going live, or finished.
            </div>
          ) : null}

          {viewerPermissions.includes('review_ads') ? (
            canReview ? (
              <div className="flex flex-wrap gap-2">
                <Button className="rounded-full" onClick={() => void onReview(campaign, 'approved')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve ad
                </Button>
                <Button variant="destructive" className="rounded-full" onClick={() => void onReview(campaign, 'rejected')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject ad
                </Button>
              </div>
            ) : blockedReason ? (
              <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{blockedReason}</p>
                </div>
              </div>
            ) : null
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminClient({ initialViewer }: { initialViewer: AdminViewer | null }) {
  const docsUrl = useMemo(() => '/api/openapi', []);
  const [viewer, setViewer] = useState(initialViewer);
  const [section, setSection] = useState<AdminSectionId>('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<StaffFormState>(emptyStaffForm());
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [staff, setStaff] = useState<AdminStaffAccount[]>([]);
  const [ads, setAds] = useState<Record<string, unknown> | null>(null);
  const [adminAdsTab, setAdminAdsTab] = useState<AdminAdsTabId>('pending');
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [channels, setChannels] = useState<Record<string, unknown>[]>([]);
  const [videos, setVideos] = useState<Record<string, unknown>[]>([]);
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [posts, setPosts] = useState<Record<string, unknown>[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [finance, setFinance] = useState<Record<string, unknown> | null>(null);
  const [system, setSystem] = useState<Record<string, unknown> | null>(null);
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState | null>(null);
  const [rejectReasonCode, setRejectReasonCode] = useState<keyof typeof AD_REJECTION_REASON_LABELS>('landing_page_mismatch');
  const [rejectCustomReason, setRejectCustomReason] = useState('');
  const [rejectNotifyMode, setRejectNotifyMode] = useState<'in_app' | 'email' | 'both'>('both');
  const swaggerRef = useRef<HTMLDivElement | null>(null);

  const sections = useMemo(() => ADMIN_SECTION_DEFINITIONS.filter((item) => viewer?.permissions.includes(item.permission)), [viewer]);

  useEffect(() => {
    if (sections.length > 0 && !sections.some((item) => item.id === section)) setSection(sections[0].id);
  }, [section, sections]);

  useEffect(() => {
    if (!viewer || section !== 'api-docs' || !window.SwaggerUIBundle) return;
    if (swaggerRef.current) swaggerRef.current.innerHTML = '';
    window.SwaggerUIBundle({ url: docsUrl, dom_id: '#swagger-ui', deepLinking: true, displayRequestDuration: true, persistAuthorization: true, docExpansion: 'list', tryItOutEnabled: true });
  }, [docsUrl, section, viewer]);

  useEffect(() => {
    if (section === 'api-docs') {
      return;
    }

    if (swaggerRef.current) {
      swaggerRef.current.innerHTML = '';
    }

    const swaggerNode = typeof document !== 'undefined' ? document.getElementById('swagger-ui') : null;
    if (swaggerNode) {
      swaggerNode.innerHTML = '';
    }
  }, [section]);

  async function json(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error((payload && typeof payload === 'object' && 'message' in payload) ? String(payload.message) : `Request failed: ${response.status}`);
    return payload;
  }

  async function load(nextSection: AdminSectionId, nextQuery = '') {
    if (!viewer || nextSection === 'api-docs') return;
    setLoading(true); setError(null);
    try {
      if (nextSection === 'dashboard') setDashboard(await json('/api/api-docs/dashboard'));
      if (nextSection === 'staff') { const payload = await json('/api/api-docs/staff'); setStaff(payload.staff ?? []); }
      if (nextSection === 'ads') setAds(await json('/api/api-docs/ads'));
      if (nextSection === 'users') { const payload = await json(`/api/api-docs/users?q=${encodeURIComponent(nextQuery)}`); setUsers(payload.items ?? []); }
      if (nextSection === 'channels') { const payload = await json(`/api/api-docs/channels?q=${encodeURIComponent(nextQuery)}`); setChannels(payload.items ?? []); }
      if (nextSection === 'videos') { const payload = await json(`/api/api-docs/videos?q=${encodeURIComponent(nextQuery)}`); setVideos(payload.items ?? []); }
      if (nextSection === 'comments') { const payload = await json(`/api/api-docs/comments?q=${encodeURIComponent(nextQuery)}`); setComments(payload.items ?? []); }
      if (nextSection === 'posts') { const payload = await json(`/api/api-docs/posts?q=${encodeURIComponent(nextQuery)}`); setPosts(payload.items ?? []); }
      if (nextSection === 'analytics') setAnalytics(await json('/api/api-docs/analytics'));
      if (nextSection === 'finance') setFinance(await json('/api/api-docs/finance'));
      if (nextSection === 'system') setSystem(await json('/api/api-docs/system'));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'The section could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (viewer) void load(section, query);
  }, [section, viewer]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setAuthError(null);
    try {
      const payload = await json('/api/api-docs/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      setViewer(payload.viewer ?? null); setEmail(''); setPassword('');
    } catch {
      setAuthError('That admin email or password was incorrect.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch('/api/api-docs/logout', { method: 'POST' }).catch(() => null);
    setViewer(null); setDashboard(null); setAds(null); setStaff([]); setUsers([]); setChannels([]); setVideos([]); setComments([]); setPosts([]); setAnalytics(null); setFinance(null); setSystem(null);
  }

  function beginEditStaff(account: AdminStaffAccount) {
    setEditingStaffId(account.id);
    setStaffForm({
      name: account.name,
      username: account.username,
      email: account.email,
      password: '',
      role: account.role,
      status: account.status,
      notes: account.notes || '',
      allowedTags: account.docsAccess.allowedTags,
      allowedPathPrefixes: account.docsAccess.allowedPathPrefixes,
      allowedExactPaths: account.docsAccess.allowedExactPaths,
      overrides: Object.fromEntries(account.permissionOverrides.map((item) => [item.permission, item.effect])),
    });
  }

  function resetStaff() { setEditingStaffId(null); setStaffForm(emptyStaffForm()); }

  async function saveStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(null);
    try {
      const permissionOverrides = Object.entries(staffForm.overrides).filter((entry): entry is [AdminPermission, AdminPermissionEffect] => entry[1] === 'allow' || entry[1] === 'deny').map(([permission, effect]) => ({ permission, effect }));
      await json(editingStaffId ? `/api/api-docs/staff/${editingStaffId}` : '/api/api-docs/staff', {
        method: editingStaffId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: staffForm.name, username: staffForm.username, email: staffForm.email, password: staffForm.password, role: staffForm.role, status: staffForm.status, notes: staffForm.notes,
          docsAccess: { allowedTags: staffForm.allowedTags, allowedPathPrefixes: staffForm.allowedPathPrefixes, allowedExactPaths: staffForm.allowedExactPaths },
          permissionOverrides,
        }),
      });
      resetStaff();
      await load('staff');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The staff account could not be saved.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStaff(account: AdminStaffAccount) {
    setLoading(true); setError(null);
    try {
      await json(`/api/api-docs/staff/${account.id}/${account.status === 'active' ? 'disable' : 'enable'}`, { method: 'POST' });
      await load('staff');
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'The staff account could not be updated.');
    } finally {
      setLoading(false);
    }
  }

  async function reviewAd(
    campaign: Record<string, unknown>,
    action: 'approved' | 'rejected',
    options?: {
      notes?: string | null;
      rejectionReasonCode?: keyof typeof AD_REJECTION_REASON_LABELS;
      rejectionCustomReason?: string | null;
      notifyMode?: 'in_app' | 'email' | 'both';
    }
  ) {
    const campaignId = String(campaign.id || '');
    if (!campaignId) {
      return;
    }

    if (action === 'rejected' && !options?.rejectionReasonCode) {
      setRejectDialog({
        campaignId,
        title: String(campaign.title || 'Untitled campaign'),
      });
      return;
    }

    setLoading(true); setError(null);
    try {
      await reviewAdminAdCampaignClient(campaignId, {
        action,
        notes: options?.notes || null,
        rejectionReasonCode: options?.rejectionReasonCode || null,
        rejectionCustomReason: options?.rejectionCustomReason || null,
        notifyMode: options?.notifyMode || null,
      });
      await load('ads');
      if (section === 'dashboard') await load('dashboard');
      setRejectDialog(null);
      setRejectCustomReason('');
      setRejectReasonCode('landing_page_mismatch');
      setRejectNotifyMode('both');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'The campaign review could not be saved.');
    } finally {
      setLoading(false);
    }
  }

  function searchBar(title: string) {
    return <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void load(section, query); }} className="w-56 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500" placeholder={`Search ${title.toLowerCase()}`} /><Button variant="secondary" className="rounded-full bg-slate-800 text-slate-100 hover:bg-slate-700" onClick={() => void load(section, query)}>Search</Button></div>;
  }

  const viewerPermissions = viewer?.permissions ?? [];

  const content = (() => {
    if (section === 'dashboard') {
      const counts = (dashboard?.counts ?? {}) as Record<string, number>;
      const queue = Array.isArray(dashboard?.pendingAds) ? (dashboard?.pendingAds as Array<Record<string, unknown>>) : [];
      const recentFinance = Array.isArray(dashboard?.recentFinance) ? (dashboard?.recentFinance as Array<Record<string, unknown>>) : [];
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Users" hint="Registered platform users" value={counts.users ?? 0} />
            <Card title="Videos" hint="Videos and Shorts in catalog" value={counts.videos ?? 0} />
            <Card title="Pending Ads" hint="Campaigns waiting on review" value={counts.pendingAds ?? 0} />
            <Card title="Staff" hint="Internal staff accounts" value={counts.staff ?? 0} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-semibold text-white">Pending ad review queue</h2><div className="mt-4 space-y-3">{queue.length === 0 ? <Empty title="Nothing waiting" body="Campaigns that still have a pending review state will appear here." /> : queue.map((entry, index) => { const campaign = entry.campaign as Record<string, unknown> | null; const creative = entry.creative as Record<string, unknown> | null; const { canReview, blockedReason } = getReviewActionState(entry); return <div key={String(campaign?.id ?? index)} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-base font-semibold text-white">{String(creative?.title ?? 'Untitled campaign')}</p><p className="mt-1 text-sm text-slate-400">{String(creative?.sponsor_name ?? creative?.sponsorName ?? 'Sponsored')} · {String(campaign?.placement_scope ?? campaign?.placement ?? 'both')}</p></div><div className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">{String(campaign?.status ?? 'draft')}</div></div><p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">Payment: {String(campaign?.payment_status ?? 'unpaid')} · Review: {String(campaign?.review_status ?? 'pending')}</p>{viewerPermissions.includes('review_ads') && campaign?.id ? canReview ? <div className="mt-4 flex gap-2"><Button className="rounded-full" onClick={() => void reviewAd(campaign, 'approved')}>Approve</Button><Button variant="destructive" className="rounded-full" onClick={() => setRejectDialog({ campaignId: String(campaign.id), title: String(creative?.title ?? 'Untitled campaign') })}>Reject</Button></div> : <p className="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">{blockedReason || 'This campaign is not reviewable yet.'}</p> : null}</div>; })}</div></div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-semibold text-white">Recent finance</h2><div className="mt-4 space-y-3">{recentFinance.length === 0 ? <Empty title="No finance activity" body="Orders and payments will appear here once campaigns are purchased." /> : recentFinance.map((row) => <div key={String(row.id)} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><p className="text-sm font-semibold text-white">{String(row.razorpay_order_id)}</p><p className="mt-1 text-sm text-slate-400">{String(row.order_status)} · {String(row.payment_record_status ?? row.campaign_status)}</p><p className="mt-2 text-base font-medium text-white">{currency(row.total_paise)}</p></div>)}</div></div>
          </div>
        </div>
      );
    }
    if (section === 'api-docs') return <div className="rounded-3xl border border-slate-800 bg-white p-4 text-black shadow-2xl"><div id="swagger-ui" ref={swaggerRef} className="min-h-[60vh]" /></div>;
    if (section === 'staff') {
      return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">Staff & access</h2><p className="mt-1 text-sm text-slate-400">Separate internal staff accounts with fixed roles and permission overrides.</p></div><div className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">{staff.length} staff</div></div><div className="space-y-4">{staff.length === 0 ? <Empty title="No staff accounts yet" body="Create the first internal staff account here." /> : staff.map((account) => <div key={account.id} className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-semibold text-white">{account.name}</p><p className="text-sm text-slate-400">@{account.username} · {account.email}</p></div><div className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">{account.role}</div></div><div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2"><p>Status: {account.status}</p><p>Last login: {dt(account.lastLoginAt)}</p><p>Docs tags: {account.docsAccess.allowedTags.length > 0 ? account.docsAccess.allowedTags.join(', ') : 'Default'}</p><p>Overrides: {account.permissionOverrides.length}</p></div><div className="mt-4 flex gap-2"><Button variant="secondary" className="rounded-full bg-slate-800 text-slate-100 hover:bg-slate-700" onClick={() => beginEditStaff(account)}>Edit</Button><Button variant={account.status === 'active' ? 'destructive' : 'secondary'} className="rounded-full" onClick={() => void toggleStaff(account)}>{account.status === 'active' ? 'Disable' : 'Enable'}</Button></div></div>)}</div></div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">{editingStaffId ? 'Edit staff account' : 'Create staff account'}</h3><p className="mt-1 text-sm text-slate-400">Only super admins should manage roles and overrides.</p></div>{editingStaffId ? <Button variant="ghost" className="rounded-full text-slate-300 hover:bg-slate-900 hover:text-white" onClick={resetStaff}>Reset</Button> : null}</div><form className="space-y-4" onSubmit={saveStaff}><div className="grid gap-4 sm:grid-cols-2"><input value={staffForm.name} onChange={(event) => setStaffForm((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-slate-100 outline-none focus:border-primary" placeholder="Name" /><input value={staffForm.username} onChange={(event) => setStaffForm((current) => ({ ...current, username: event.target.value }))} className="h-11 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-slate-100 outline-none focus:border-primary" placeholder="Username" /></div><input type="email" value={staffForm.email} onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-slate-100 outline-none focus:border-primary" placeholder="Email" /><input value={staffForm.password} onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-slate-100 outline-none focus:border-primary" placeholder={editingStaffId ? 'Leave blank to keep the current password' : 'Password'} /><div className="grid gap-4 sm:grid-cols-2"><select value={staffForm.role} onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value as AdminRole }))} className="h-11 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-slate-100 outline-none focus:border-primary">{ADMIN_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select><select value={staffForm.status} onChange={(event) => setStaffForm((current) => ({ ...current, status: event.target.value as 'active' | 'disabled' }))} className="h-11 rounded-2xl border border-slate-800 bg-slate-950 px-4 text-slate-100 outline-none focus:border-primary"><option value="active">active</option><option value="disabled">disabled</option></select></div><textarea value={staffForm.notes} onChange={(event) => setStaffForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-primary" placeholder="Notes" /><select multiple value={staffForm.allowedTags} onChange={(event) => setStaffForm((current) => ({ ...current, allowedTags: toList(event) }))} className="min-h-24 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-primary">{DOCS_TAG_OPTIONS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select><select multiple value={staffForm.allowedPathPrefixes} onChange={(event) => setStaffForm((current) => ({ ...current, allowedPathPrefixes: toList(event) }))} className="min-h-24 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-primary">{DOCS_PREFIX_OPTIONS.map((prefix) => <option key={prefix} value={prefix}>{prefix}</option>)}</select><select multiple value={staffForm.allowedExactPaths} onChange={(event) => setStaffForm((current) => ({ ...current, allowedExactPaths: toList(event) }))} className="min-h-24 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-primary">{DOCS_EXACT_OPTIONS.map((exact) => <option key={exact} value={exact}>{exact}</option>)}</select><div className="grid gap-3">{(Object.entries(ADMIN_PERMISSION_LABELS) as Array<[AdminPermission, string]>).map(([permission, label]) => <div key={permission} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"><div><p className="text-sm font-medium text-white">{label}</p><p className="text-xs text-slate-500">{permission}</p></div><select value={staffForm.overrides[permission] ?? ''} onChange={(event) => setStaffForm((current) => ({ ...current, overrides: { ...current.overrides, [permission]: (event.target.value as AdminPermissionEffect | '') || '' } }))} className="h-10 rounded-2xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-primary"><option value="">Role default</option><option value="allow">Allow</option><option value="deny">Deny</option></select></div>)}</div><Button type="submit" className="h-11 rounded-full px-6" disabled={loading}>{loading ? 'Saving...' : editingStaffId ? 'Update staff' : 'Create staff'}</Button></form></div>
        </div>
      );
    }
    if (section === 'ads') {
      const queue = Array.isArray(ads?.queue) ? (ads.queue as Array<Record<string, unknown>>) : [];
      const campaigns = Array.isArray(ads?.campaigns) ? (ads.campaigns as Array<Record<string, unknown>>) : [];
      const tabs = adminAdsTabDefinitions(campaigns);
      const filteredCampaigns = campaigns.filter((campaign) => matchesAdminAdsTab(campaign, adminAdsTab));
      return (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Ads operations</h2>
                <p className="mt-2 text-sm text-slate-400">Review, approve, reject, and monitor campaign states from one admin workspace.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pending review</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{queue.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total campaigns</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{campaigns.length}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminAdsTab(tab.id)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    adminAdsTab === tab.id ? 'bg-primary/15 text-white' : 'bg-slate-950/60 text-slate-300 hover:bg-slate-900 hover:text-white'
                  )}
                >
                  {tab.label}
                  <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredCampaigns.length === 0 ? (
            <Empty title="No campaigns in this state" body="Switch tabs to inspect other ad states or wait for new campaigns to arrive." />
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <AdminAdsCampaignCard
                  key={String(campaign.id)}
                  campaign={campaign}
                  viewerPermissions={viewerPermissions}
                  onReview={reviewAd}
                />
              ))}
            </div>
          )}
        </div>
      );
    }
    if (section === 'analytics') {
      const platform = Array.isArray(analytics?.platform) ? (analytics.platform as Array<Record<string, unknown>>) : [];
      const financeRows = Array.isArray(analytics?.adsFinance) ? (analytics.adsFinance as Array<Record<string, unknown>>) : [];
      return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card title="Tracked days" hint="Daily platform points loaded" value={platform.length} /><Card title="Latest views" hint="Most recent view delta" value={Number(platform.at(-1)?.views_delta ?? 0)} /><Card title="Latest likes" hint="Most recent like delta" value={Number(platform.at(-1)?.likes_delta ?? 0)} /><Card title="Latest shares" hint="Most recent share delta" value={Number(platform.at(-1)?.shares_delta ?? 0)} /></div><Table columns={[{ key: 'activity_date', label: 'Date' }, { key: 'views_delta', label: 'Views' }, { key: 'likes_delta', label: 'Likes' }, { key: 'comments_delta', label: 'Comments' }, { key: 'shares_delta', label: 'Shares' }]} rows={platform} /><Table columns={[{ key: 'razorpay_order_id', label: 'Order' }, { key: 'order_status', label: 'Order status' }, { key: 'payment_record_status', label: 'Payment' }, { key: 'campaign_status', label: 'Campaign status' }, { key: 'total_paise', label: 'Total (paise)' }]} rows={financeRows} /></div>;
    }
    if (section === 'finance') return <Table columns={[{ key: 'razorpay_order_id', label: 'Razorpay order' }, { key: 'order_status', label: 'Order status' }, { key: 'payment_record_status', label: 'Payment' }, { key: 'campaign_status', label: 'Campaign status' }, { key: 'currency', label: 'Currency' }, { key: 'total_paise', label: 'Total (paise)' }]} rows={Array.isArray(finance?.orders) ? (finance.orders as Array<Record<string, unknown>>) : []} />;
    if (section === 'system') return <div className="grid gap-6 xl:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]"><div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-semibold text-white">Runtime summary</h2><div className="mt-4 space-y-3">{[{ label: 'Environment mode', value: String(system?.appEnvMode ?? 'development') }, { label: 'Node env', value: String(system?.nodeEnv ?? 'development') }, { label: 'Internal tools enabled', value: String(system?.internalToolsEnabled ?? true) }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p><p className="mt-2 text-base font-medium text-white">{item.value}</p></div>)}</div></div><div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-semibold text-white">Available admin sections</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{ADMIN_SECTION_DEFINITIONS.map((item) => <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><p className="text-sm font-semibold text-white">{item.label}</p><p className="mt-1 text-sm text-slate-400">{item.description}</p><p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{item.permission}</p></div>)}</div></div></div>;
    const titleMap: Record<string, string> = { users: 'Users', channels: 'Channels', videos: 'Videos & Shorts', comments: 'Comments', posts: 'Posts' };
    const rowsMap: Record<string, Array<Record<string, unknown>>> = { users, channels, videos, comments, posts };
    const columnsMap: Record<string, Array<{ key: string; label: string }>> = {
      users: [{ key: 'display_name', label: 'Display name' }, { key: 'email', label: 'Email' }, { key: 'handle', label: 'Handle' }, { key: 'subscriptions_count', label: 'Subscriptions' }, { key: 'watch_later_count', label: 'Watch later' }, { key: 'history_count', label: 'History' }],
      channels: [{ key: 'name', label: 'Name' }, { key: 'handle', label: 'Handle' }, { key: 'owner_email', label: 'Owner email' }, { key: 'subscriber_count', label: 'Subscribers' }, { key: 'videos_count', label: 'Videos' }, { key: 'posts_count', label: 'Posts' }],
      videos: [{ key: 'title', label: 'Title' }, { key: 'visibility', label: 'Visibility' }, { key: 'author_handle', label: 'Author' }, { key: 'view_count', label: 'Views' }, { key: 'likes', label: 'Likes' }, { key: 'comment_count', label: 'Comments' }],
      comments: [{ key: 'author_handle', label: 'Author' }, { key: 'text', label: 'Comment' }, { key: 'video_id', label: 'Video id' }, { key: 'post_id', label: 'Post id' }, { key: 'likes', label: 'Likes' }, { key: 'created_at', label: 'Created' }],
      posts: [{ key: 'author_handle', label: 'Author' }, { key: 'text', label: 'Post' }, { key: 'likes', label: 'Likes' }, { key: 'dislikes', label: 'Dislikes' }, { key: 'comment_count', label: 'Comments' }, { key: 'created_at', label: 'Created' }],
    };
    return <div className="space-y-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold text-white">{titleMap[section]}</h2><p className="mt-1 text-sm text-slate-400">Real internal data for the {titleMap[section].toLowerCase()} area.</p></div>{searchBar(titleMap[section])}</div><Table columns={columnsMap[section]} rows={rowsMap[section]} /></div>;
  })();

  if (!viewer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
        <div className="w-full max-w-2xl rounded-[32px] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <div className="mb-8"><div className="mb-4 flex items-center gap-3 text-slate-200"><Shield className="h-5 w-5" /><span className="text-sm uppercase tracking-[0.2em] text-slate-500">Development-only admin</span></div><h1 className="text-3xl font-semibold text-white">Waslmedia Internal Admin</h1><p className="mt-3 text-sm text-slate-400">Sign in with a bootstrap admin or internal staff account to open the admin shell.</p></div>
          <form className="space-y-4" onSubmit={login}>
            <div><label className="mb-2 block text-sm font-medium text-slate-200">Email</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-slate-100 outline-none focus:border-primary" autoComplete="username" required /></div>
            <div><label className="mb-2 block text-sm font-medium text-slate-200">Password</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-slate-100 outline-none focus:border-primary" autoComplete="current-password" required /></div>
            {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
            <Button type="submit" className="h-11 rounded-full px-6" disabled={loading}>{loading ? 'Opening admin...' : 'Open admin'}</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <style jsx global>{`#swagger-ui .swagger-ui { background: transparent; } #swagger-ui .swagger-ui .wrapper { max-width: none; padding: 12px; }`}</style>
      <Script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" strategy="afterInteractive" />
      <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
        <div className="shrink-0 border-b border-slate-800 bg-slate-950/95 px-6 py-5"><div className="flex items-start justify-between gap-4"><div><div className="mb-3 flex items-center gap-3 text-slate-300"><Shield className="h-5 w-5" /><span className="text-sm uppercase tracking-[0.22em] text-slate-500">Development admin shell</span></div><h1 className="text-3xl font-semibold text-white">Waslmedia Internal Admin</h1><p className="mt-2 text-sm text-slate-400">API Docs now live inside the broader internal admin system.</p></div><div className="flex items-center gap-3"><div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-right"><p className="text-sm font-semibold text-white">{viewer.name}</p><p className="text-xs text-slate-400">{viewer.role} · {viewer.email}</p></div><Button variant="secondary" className="rounded-full bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Log out</Button></div></div></div>
        <div className="grid min-h-0 flex-1 md:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="overflow-y-auto border-r border-slate-800 bg-slate-950/80 p-4"><p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-500">Admin navigation</p><div className="space-y-2">{sections.map((item) => { const Icon = NAV_ICONS[item.id]; return <button key={item.id} type="button" className={cn('flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-colors', section === item.id ? 'bg-primary/15 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white')} onClick={() => { setSection(item.id); setQuery(''); }}><Icon className="h-4 w-4" /><span>{item.label}</span></button>; })}</div></aside>
          <main className="min-h-0 overflow-y-auto bg-slate-900/40 p-6"><div key={section}>{loading && section !== 'api-docs' ? <div className="mb-4 flex items-center gap-2 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" />Loading section...</div> : null}{error ? <div className="mb-4 rounded-3xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">{error}</div> : null}{content}</div></main>
        </div>
      </div>
      <Dialog open={Boolean(rejectDialog)} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="max-w-2xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Reject ad campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-[20px] border border-border/70 bg-secondary/15 p-4">
              <p className="text-sm text-muted-foreground">Campaign</p>
              <p className="mt-2 text-lg font-semibold">{rejectDialog?.title || 'Selected ad campaign'}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Preset reason</label>
                <select
                  value={rejectReasonCode}
                  onChange={(event) => setRejectReasonCode(event.target.value as keyof typeof AD_REJECTION_REASON_LABELS)}
                  className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none"
                >
                  {Object.entries(AD_REJECTION_REASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notify advertiser</label>
                <select
                  value={rejectNotifyMode}
                  onChange={(event) => setRejectNotifyMode(event.target.value as 'in_app' | 'email' | 'both')}
                  className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm outline-none"
                >
                  {Object.entries(AD_NOTIFY_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Extra explanation</label>
              <Textarea
                value={rejectCustomReason}
                onChange={(event) => setRejectCustomReason(event.target.value)}
                className="min-h-[120px] rounded-[20px]"
                placeholder="Explain what needs to be fixed before this ad can be approved."
              />
            </div>
            <div className="rounded-[20px] border border-border/70 bg-secondary/10 p-4">
              <p className="text-sm text-muted-foreground">What happens next</p>
              <p className="mt-2 text-sm leading-6">
                The advertiser will lose this ad from the main Studio Ads workspace, receive the rejection reason in Studio notifications,
                and the ad will move into rejected history where it can be edited and resubmitted later.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => rejectDialog && void reviewAd(
                { id: rejectDialog.campaignId, title: rejectDialog.title },
                'rejected',
                {
                  notes: rejectCustomReason.trim() || null,
                  rejectionReasonCode: rejectReasonCode,
                  rejectionCustomReason: rejectCustomReason.trim() || null,
                  notifyMode: rejectNotifyMode,
                }
              )}
            >
              Reject ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
