export type AdminRole =
  | 'super_admin'
  | 'developer'
  | 'ads_manager'
  | 'content_manager'
  | 'support_manager'
  | 'analytics_manager'
  | 'finance_manager';

export type AdminPermission =
  | 'view_dashboard'
  | 'view_api_docs'
  | 'view_staff'
  | 'manage_staff'
  | 'view_ads'
  | 'review_ads'
  | 'view_users'
  | 'view_channels'
  | 'view_videos'
  | 'manage_videos'
  | 'view_comments'
  | 'moderate_comments'
  | 'view_posts'
  | 'moderate_posts'
  | 'view_platform_analytics'
  | 'view_finance'
  | 'view_system';

export type AdminPermissionEffect = 'allow' | 'deny';
export type AdminStaffStatus = 'active' | 'disabled';

export type AdminDocsAccess = {
  allowedTags: string[];
  allowedPathPrefixes: string[];
  allowedExactPaths: string[];
};

export type AdminPermissionOverride = {
  permission: AdminPermission;
  effect: AdminPermissionEffect;
};

export type AdminStaffAccount = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: AdminRole;
  status: AdminStaffStatus;
  notes: string | null;
  lastLoginAt: string | null;
  docsAccess: AdminDocsAccess;
  permissionOverrides: AdminPermissionOverride[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSession = {
  role: AdminRole;
  staffId?: string | null;
  source: 'bootstrap' | 'staff';
};

export type AdminViewer = {
  role: AdminRole;
  staffId: string | null;
  source: 'bootstrap' | 'staff';
  name: string;
  email: string;
  permissions: AdminPermission[];
  docsAccess?: AdminDocsAccess | null;
};

export type AdminSectionId =
  | 'dashboard'
  | 'api-docs'
  | 'staff'
  | 'ads'
  | 'users'
  | 'channels'
  | 'videos'
  | 'comments'
  | 'posts'
  | 'analytics'
  | 'finance'
  | 'system';

export type AdminSectionDefinition = {
  id: AdminSectionId;
  label: string;
  permission: AdminPermission;
  description: string;
};

