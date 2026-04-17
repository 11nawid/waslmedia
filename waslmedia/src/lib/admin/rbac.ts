import type {
  AdminPermission,
  AdminPermissionOverride,
  AdminRole,
  AdminSectionDefinition,
} from '@/lib/admin/types';

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  view_dashboard: 'View dashboard',
  view_api_docs: 'View API docs',
  view_staff: 'View staff accounts',
  manage_staff: 'Manage staff accounts',
  view_ads: 'View ad campaigns',
  review_ads: 'Review ad campaigns',
  view_users: 'View users',
  view_channels: 'View channels',
  view_videos: 'View videos and Shorts',
  manage_videos: 'Manage video visibility/status',
  view_comments: 'View comments',
  moderate_comments: 'Moderate comments',
  view_posts: 'View posts',
  moderate_posts: 'Moderate posts',
  view_platform_analytics: 'View platform analytics',
  view_finance: 'View finance',
  view_system: 'View system tools',
};

export const ADMIN_ROLES: AdminRole[] = [
  'super_admin',
  'developer',
  'ads_manager',
  'content_manager',
  'support_manager',
  'analytics_manager',
  'finance_manager',
];

export const ADMIN_SECTION_DEFINITIONS: AdminSectionDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    permission: 'view_dashboard',
    description: 'Internal operations summary and quick stats.',
  },
  {
    id: 'api-docs',
    label: 'API Docs',
    permission: 'view_api_docs',
    description: 'Protected Swagger and internal API references.',
  },
  {
    id: 'staff',
    label: 'Staff',
    permission: 'view_staff',
    description: 'Manage internal staff accounts, roles, and access.',
  },
  {
    id: 'ads',
    label: 'Ads',
    permission: 'view_ads',
    description: 'Review and manage internal ad operations.',
  },
  {
    id: 'users',
    label: 'Users',
    permission: 'view_users',
    description: 'Look up Waslmedia user accounts and account state.',
  },
  {
    id: 'channels',
    label: 'Channels',
    permission: 'view_channels',
    description: 'Inspect channels and public metadata.',
  },
  {
    id: 'videos',
    label: 'Videos & Shorts',
    permission: 'view_videos',
    description: 'Search and moderate videos and Shorts.',
  },
  {
    id: 'comments',
    label: 'Comments',
    permission: 'view_comments',
    description: 'Inspect and moderate comment activity.',
  },
  {
    id: 'posts',
    label: 'Posts',
    permission: 'view_posts',
    description: 'Inspect and moderate community posts.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    permission: 'view_platform_analytics',
    description: 'Platform-level metrics and trend summaries.',
  },
  {
    id: 'finance',
    label: 'Finance',
    permission: 'view_finance',
    description: 'Razorpay order and payment visibility.',
  },
  {
    id: 'system',
    label: 'System',
    permission: 'view_system',
    description: 'Runtime configuration and internal diagnostics.',
  },
];

const PERMISSION_DEFAULTS: Record<AdminRole, AdminPermission[]> = {
  super_admin: Object.keys(ADMIN_PERMISSION_LABELS) as AdminPermission[],
  developer: ['view_dashboard', 'view_api_docs', 'view_system', 'view_platform_analytics'],
  ads_manager: ['view_dashboard', 'view_ads', 'review_ads', 'view_platform_analytics'],
  content_manager: [
    'view_dashboard',
    'view_channels',
    'view_videos',
    'manage_videos',
    'view_comments',
    'moderate_comments',
    'view_posts',
    'moderate_posts',
  ],
  support_manager: ['view_dashboard', 'view_users', 'view_channels', 'view_videos', 'view_comments', 'view_posts'],
  analytics_manager: ['view_dashboard', 'view_platform_analytics', 'view_ads'],
  finance_manager: ['view_dashboard', 'view_finance', 'view_ads'],
};

export function getRoleDefaultPermissions(role: AdminRole) {
  return PERMISSION_DEFAULTS[role];
}

export function getEffectiveAdminPermissions(role: AdminRole, overrides: AdminPermissionOverride[] = []) {
  if (role === 'super_admin') {
    return [...getRoleDefaultPermissions(role)];
  }

  const permissionSet = new Set(getRoleDefaultPermissions(role));
  for (const override of overrides) {
    if (override.effect === 'allow') {
      permissionSet.add(override.permission);
    } else {
      permissionSet.delete(override.permission);
    }
  }

  return [...permissionSet];
}

export function hasAdminPermission(
  permissions: AdminPermission[],
  permission: AdminPermission
) {
  return permissions.includes(permission);
}

