import type { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import { ADMIN_PERMISSION_LABELS, ADMIN_SECTION_DEFINITIONS, getEffectiveAdminPermissions, hasAdminPermission } from '@/lib/admin/rbac';
import type { AdminPermission, AdminRole, AdminSession, AdminViewer } from '@/lib/admin/types';
import {
  createAdminAuditLog,
  createAdminStaffAccount,
  findAdminStaffById,
  listAdminStaffAccounts,
  setAdminStaffStatus,
  touchAdminStaffLogin,
  updateAdminStaffAccount,
  verifyAdminStaffCredentials,
} from '@/server/repositories/admin-staff';
import {
  getAdminDashboardCounts,
  listAdminAnalyticsPoints,
  listAdminChannels,
  listAdminComments,
  listAdminFinanceRows,
  listAdminPosts,
  listAdminUsers,
  listAdminVideos,
} from '@/server/repositories/admin-panel';
import { reviewCampaign } from '@/server/services/ads';
import { buildProtectedAssetUrlFromStorageUrl } from '@/server/utils/protected-asset';
import { getInternalAdminBootstrapConfig } from '@/server/utils/runtime-config';

function normalizeDocsAccess(docsAccess?: AdminViewer['docsAccess']) {
  return docsAccess || {
    allowedTags: [],
    allowedPathPrefixes: [],
    allowedExactPaths: [],
  };
}

export async function resolveAdminViewer(session: AdminSession | null): Promise<AdminViewer | null> {
  if (!session) {
    return null;
  }

  if (session.source === 'bootstrap' && session.role === 'super_admin') {
    const bootstrap = getInternalAdminBootstrapConfig();
    return {
      role: 'super_admin',
      staffId: null,
      source: 'bootstrap',
      name: bootstrap.name,
      email: bootstrap.email,
      permissions: getEffectiveAdminPermissions('super_admin'),
      docsAccess: normalizeDocsAccess(),
    };
  }

  if (!session.staffId) {
    return null;
  }

  const staff = await findAdminStaffById(session.staffId);
  if (!staff || staff.status !== 'active') {
    return null;
  }

  return {
    role: staff.role,
    staffId: staff.id,
    source: 'staff',
    name: staff.name,
    email: staff.email,
    permissions: getEffectiveAdminPermissions(staff.role, staff.permissionOverrides),
    docsAccess: staff.docsAccess,
  };
}

export async function authenticateAdminLogin(email: string, password: string) {
  const bootstrap = getInternalAdminBootstrapConfig();
  if (email.trim().toLowerCase() === bootstrap.email.toLowerCase() && password.trim() === bootstrap.password) {
    return {
      session: {
        role: 'super_admin' as const,
        staffId: null,
        source: 'bootstrap' as const,
      },
      viewer: {
        role: 'super_admin' as const,
        staffId: null,
        source: 'bootstrap' as const,
        name: bootstrap.name,
        email: bootstrap.email,
        permissions: getEffectiveAdminPermissions('super_admin'),
        docsAccess: normalizeDocsAccess(),
      },
    };
  }

  const staff = await verifyAdminStaffCredentials(email, password);
  if (!staff) {
    return null;
  }

  await touchAdminStaffLogin(staff.id);
  await createAdminAuditLog({
    actorStaffId: staff.id,
    action: 'staff.login',
    targetType: 'staff_account',
    targetId: staff.id,
    metadata: { role: staff.role },
  });

  return {
    session: {
      role: staff.role,
      staffId: staff.id,
      source: 'staff' as const,
    },
    viewer: {
      role: staff.role,
      staffId: staff.id,
      source: 'staff' as const,
      name: staff.name,
      email: staff.email,
      permissions: getEffectiveAdminPermissions(staff.role, staff.permissionOverrides),
      docsAccess: staff.docsAccess,
    },
  };
}

export function getAdminPermissionsCatalog() {
  return {
    permissions: Object.entries(ADMIN_PERMISSION_LABELS).map(([key, label]) => ({
      key,
      label,
    })),
    sections: ADMIN_SECTION_DEFINITIONS,
  };
}

export async function getAdminDashboardPayload() {
  const counts = await getAdminDashboardCounts();
  const [adsPayload, analyticsPoints, financeRows] = await Promise.all([
    listAdminAds(),
    listAdminAnalyticsPoints(7),
    listAdminFinanceRows(5),
  ]);

  return {
    counts: {
      users: counts?.users_count || 0,
      channels: counts?.channels_count || 0,
      videos: counts?.videos_count || 0,
      comments: counts?.comments_count || 0,
      posts: counts?.posts_count || 0,
      pendingAds: counts?.ads_pending_count || 0,
      activeAds: counts?.ads_active_count || 0,
      staff: counts?.staff_count || 0,
    },
    pendingAds: adsPayload.queue,
    analytics: analyticsPoints.map((row) => ({
      date: String(row.activity_date),
      views: Number(row.views_delta || 0),
      likes: Number(row.likes_delta || 0),
      comments: Number(row.comments_delta || 0),
      shares: Number(row.shares_delta || 0),
    })),
    recentFinance: financeRows,
  };
}

export async function listAdminAds() {
  const [rows] = await dbPool.query<RowDataPacket[]>(
    `SELECT
       c.id,
       c.status,
       c.review_status,
       c.payment_status,
       c.placement_scope,
       c.destination_url,
       c.cta_label,
       c.budget_paise,
       c.total_paise,
       c.spend_paise,
       c.total_impressions,
       c.total_clicks,
       c.start_at,
       c.end_at,
       c.created_at,
       cr.title,
       cr.description,
       cr.sponsor_name,
       cr.sponsor_domain,
       cr.thumbnail_storage_ref
     FROM ad_campaigns c
     LEFT JOIN ad_creatives cr ON cr.campaign_id = c.id
     ORDER BY c.updated_at DESC`
  );

  const campaigns = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    sponsor_name: row.sponsor_name,
    sponsor_domain: row.sponsor_domain,
    thumbnail_storage_ref: row.thumbnail_storage_ref,
    thumbnail_url: buildProtectedAssetUrlFromStorageUrl(row.thumbnail_storage_ref),
    status: row.status,
    review_status: row.review_status,
    payment_status: row.payment_status,
    placement_scope: row.placement_scope,
    destination_url: row.destination_url,
    cta_label: row.cta_label,
    budget_paise: row.budget_paise,
    total_paise: row.total_paise,
    spend_paise: row.spend_paise,
    total_impressions: row.total_impressions,
    total_clicks: row.total_clicks,
    start_at: row.start_at,
    end_at: row.end_at,
    created_at: row.created_at,
  }));

  const queue = campaigns
    .filter((row) => row.review_status === 'pending')
    .map((row) => {
      const canReview = row.payment_status === 'paid' && row.status === 'paid_pending_review';
      const reviewBlockedReason = canReview
        ? null
        : row.payment_status !== 'paid'
          ? 'Waiting for verified payment before review can start.'
          : row.status !== 'paid_pending_review'
            ? row.status === 'draft'
              ? 'This paid ad is still in draft. Ask the advertiser to resubmit it from Studio Ads so it returns to the review queue.'
              : `Current status is ${row.status}. Move it back to the review stage before approving or rejecting it.`
            : 'This campaign is not ready for review yet.';

      return {
        campaign: {
          id: row.id,
          status: row.status,
          review_status: row.review_status,
          payment_status: row.payment_status,
          placement: row.placement_scope,
          placement_scope: row.placement_scope,
          total_impressions: row.total_impressions,
          total_clicks: row.total_clicks,
          destination_url: row.destination_url,
        },
        creative: {
          title: row.title,
          sponsor_name: row.sponsor_name,
          sponsor_domain: row.sponsor_domain,
          description: row.description,
        },
        canReview,
        reviewBlockedReason,
      };
    });

  return {
    queue,
    campaigns,
  };
}

export async function reviewAdCampaignAsStaff(input: {
  campaignId: string;
  action: 'approved' | 'rejected';
  notes?: string | null;
  rejectionReasonCode?: import('@/lib/ads/types').AdRejectionReasonCode | null;
  rejectionCustomReason?: string | null;
  notifyMode?: import('@/lib/ads/types').AdNotifyMode | null;
  actor: AdminViewer;
}) {
  if (!hasAdminPermission(input.actor.permissions, 'review_ads')) {
    throw new Error('ADMIN_PERMISSION_DENIED');
  }

  const result = await reviewCampaign({
    campaignId: input.campaignId,
    reviewerStaffId: input.actor.staffId,
    action: input.action,
    notes: input.notes || null,
    rejectionReasonCode: input.rejectionReasonCode || null,
    rejectionCustomReason: input.rejectionCustomReason || null,
    notifyMode: input.notifyMode || null,
  });

  await createAdminAuditLog({
    actorStaffId: input.actor.staffId,
    action: `ads.review.${input.action}`,
    targetType: 'ad_campaign',
    targetId: input.campaignId,
    metadata: {
      notes: input.notes || null,
      rejectionReasonCode: input.rejectionReasonCode || null,
      rejectionCustomReason: input.rejectionCustomReason || null,
      notifyMode: input.notifyMode || null,
    },
  });

  return result;
}

export async function listAdminSystemSummary() {
  return {
    appEnvMode: process.env.APP_ENV_MODE || 'development',
    nodeEnv: process.env.NODE_ENV || 'development',
    internalToolsEnabled: true,
    sections: ADMIN_SECTION_DEFINITIONS,
  };
}

export async function createStaffAccountAsAdmin(
  actor: AdminViewer,
  input: Parameters<typeof createAdminStaffAccount>[0]
) {
  if (!hasAdminPermission(actor.permissions, 'manage_staff')) {
    throw new Error('ADMIN_PERMISSION_DENIED');
  }

  const staff = await createAdminStaffAccount(input);
  await createAdminAuditLog({
    actorStaffId: actor.staffId,
    action: 'staff.create',
    targetType: 'staff_account',
    targetId: staff.id,
    metadata: { role: staff.role, email: staff.email },
  });
  return staff;
}

export async function updateStaffAccountAsAdmin(
  actor: AdminViewer,
  staffId: string,
  input: Parameters<typeof updateAdminStaffAccount>[1]
) {
  if (!hasAdminPermission(actor.permissions, 'manage_staff')) {
    throw new Error('ADMIN_PERMISSION_DENIED');
  }

  const staff = await updateAdminStaffAccount(staffId, input);
  await createAdminAuditLog({
    actorStaffId: actor.staffId,
    action: 'staff.update',
    targetType: 'staff_account',
    targetId: staff.id,
    metadata: { role: staff.role, status: staff.status },
  });
  return staff;
}

export async function setStaffStatusAsAdmin(actor: AdminViewer, staffId: string, status: 'active' | 'disabled') {
  if (!hasAdminPermission(actor.permissions, 'manage_staff')) {
    throw new Error('ADMIN_PERMISSION_DENIED');
  }

  const staff = await setAdminStaffStatus(staffId, status);
  await createAdminAuditLog({
    actorStaffId: actor.staffId,
    action: status === 'active' ? 'staff.enable' : 'staff.disable',
    targetType: 'staff_account',
    targetId: staffId,
    metadata: { status },
  });
  return staff;
}

export async function getAdminSectionData(section: string, query = '') {
  switch (section) {
    case 'users':
      return { items: await listAdminUsers(query) };
    case 'channels':
      return { items: await listAdminChannels(query) };
    case 'videos':
      return { items: await listAdminVideos(query) };
    case 'comments':
      return { items: await listAdminComments(query) };
    case 'posts':
      return { items: await listAdminPosts(query) };
    default:
      return { items: [] };
  }
}

export async function getAdminAnalyticsPayload() {
  return {
    platform: await listAdminAnalyticsPoints(14),
    adsFinance: await listAdminFinanceRows(10),
  };
}

export async function getAdminFinancePayload() {
  return {
    orders: await listAdminFinanceRows(50),
  };
}

export {
  hasAdminPermission,
  listAdminStaffAccounts,
};
