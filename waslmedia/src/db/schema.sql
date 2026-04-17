CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  photo_url TEXT NULL,
  handle VARCHAR(80) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
  user_id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  handle VARCHAR(80) NOT NULL UNIQUE,
  profile_picture_url TEXT NULL,
  banner_url TEXT NULL,
  subscriber_count INT NOT NULL DEFAULT 0,
  description TEXT NULL,
  contact_email VARCHAR(191) NULL,
  country VARCHAR(120) NULL,
  show_country TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_channels_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  user_agent_hash CHAR(64) NULL,
  ip_hash CHAR(64) NULL,
  rotated_from_session_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at),
  INDEX idx_sessions_revoked_at (revoked_at)
);

CREATE TABLE IF NOT EXISTS api_docs_developers (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(80) NOT NULL DEFAULT 'developer',
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  docs_access_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_api_docs_developers_email (email),
  INDEX idx_api_docs_developers_username (username)
);

CREATE TABLE IF NOT EXISTS admin_staff_accounts (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'developer', 'ads_manager', 'content_manager', 'support_manager', 'analytics_manager', 'finance_manager') NOT NULL DEFAULT 'developer',
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  docs_access_json LONGTEXT NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_staff_accounts_email (email),
  INDEX idx_admin_staff_accounts_username (username),
  INDEX idx_admin_staff_accounts_role_status (role, status)
);

CREATE TABLE IF NOT EXISTS admin_staff_permission_overrides (
  id CHAR(36) PRIMARY KEY,
  staff_id CHAR(36) NOT NULL,
  permission_key VARCHAR(120) NOT NULL,
  effect ENUM('allow', 'deny') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_staff_permission_overrides_staff FOREIGN KEY (staff_id) REFERENCES admin_staff_accounts(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_admin_staff_permission_override (staff_id, permission_key)
);

CREATE TABLE IF NOT EXISTS admin_staff_audit_log (
  id CHAR(36) PRIMARY KEY,
  actor_staff_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(120) NULL,
  target_id VARCHAR(120) NULL,
  metadata_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_staff_audit_actor FOREIGN KEY (actor_staff_id) REFERENCES admin_staff_accounts(id) ON DELETE SET NULL,
  INDEX idx_admin_staff_audit_action_created_at (action, created_at),
  INDEX idx_admin_staff_audit_target_created_at (target_type, target_id, created_at)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscriber_id CHAR(36) NOT NULL,
  channel_user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (subscriber_id, channel_user_id),
  CONSTRAINT fk_subscriptions_subscriber FOREIGN KEY (subscriber_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_channel FOREIGN KEY (channel_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscription_events (
  id CHAR(36) PRIMARY KEY,
  subscriber_id CHAR(36) NOT NULL,
  channel_user_id CHAR(36) NOT NULL,
  change_value SMALLINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subscription_events_channel_created_at (channel_user_id, created_at),
  INDEX idx_subscription_events_subscriber_created_at (subscriber_id, created_at)
);

CREATE TABLE IF NOT EXISTS watch_later (
  user_id CHAR(36) NOT NULL,
  video_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, video_id),
  INDEX idx_watch_later_video_id (video_id)
);

CREATE TABLE IF NOT EXISTS upload_defaults (
  user_id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  visibility ENUM('public', 'private', 'unlisted') NOT NULL DEFAULT 'private',
  category VARCHAR(120) NULL,
  tags TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_upload_defaults_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS videos (
  id CHAR(36) PRIMARY KEY,
  author_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  thumbnail_url TEXT NULL,
  video_url TEXT NULL,
  duration VARCHAR(20) NOT NULL DEFAULT '0:00',
  visibility ENUM('public', 'private', 'unlisted') NOT NULL DEFAULT 'private',
  audience ENUM('madeForKids', 'notMadeForKids') NOT NULL DEFAULT 'notMadeForKids',
  tags JSON NULL,
  language VARCHAR(80) NULL,
  category VARCHAR(120) NULL,
  comments_enabled TINYINT(1) NOT NULL DEFAULT 1,
  show_likes TINYINT(1) NOT NULL DEFAULT 1,
  summary TEXT NULL,
  timestamps TEXT NULL,
  credits TEXT NULL,
  view_count INT NOT NULL DEFAULT 0,
  likes INT NOT NULL DEFAULT 0,
  dislikes INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_videos_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_videos_author_id (author_id),
  INDEX idx_videos_visibility_created_at (visibility, created_at)
);

CREATE TABLE IF NOT EXISTS video_assets (
  video_id CHAR(36) PRIMARY KEY,
  source_bucket VARCHAR(120) NOT NULL,
  source_object_key TEXT NOT NULL,
  manifest_bucket VARCHAR(120) NULL,
  manifest_object_key TEXT NULL,
  thumbnail_bucket VARCHAR(120) NULL,
  thumbnail_object_key TEXT NULL,
  transcode_status ENUM('pending', 'processing', 'ready', 'failed') NOT NULL DEFAULT 'pending',
  renditions_json JSON NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  processed_at DATETIME NULL,
  last_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_video_assets_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS upload_media_metadata (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  bucket VARCHAR(120) NOT NULL,
  object_key TEXT NOT NULL,
  object_key_hash CHAR(64) NOT NULL,
  media_kind ENUM('long', 'short') NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 0,
  height INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_upload_media_metadata_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_upload_media_metadata_user_bucket_object_key_hash (user_id, bucket, object_key_hash),
  INDEX idx_upload_media_metadata_user_created_at (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS playback_sessions (
  id CHAR(36) PRIMARY KEY,
  video_id CHAR(36) NOT NULL,
  viewer_user_id CHAR(36) NULL,
  mode ENUM('watch', 'preview', 'shorts', 'owner-download') NOT NULL,
  playback_mode ENUM('mse', 'compat-hls', 'compat-source') NOT NULL,
  payload_json LONGTEXT NOT NULL,
  ip_hash CHAR(64) NULL,
  user_agent_hash CHAR(64) NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_playback_sessions_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  INDEX idx_playback_sessions_video_id (video_id),
  INDEX idx_playback_sessions_viewer_id (viewer_user_id),
  INDEX idx_playback_sessions_expires_at (expires_at)
);

CREATE TABLE IF NOT EXISTS history (
  user_id CHAR(36) NOT NULL,
  video_id CHAR(36) NOT NULL,
  watched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, video_id),
  INDEX idx_history_watched_at (watched_at)
);

CREATE TABLE IF NOT EXISTS user_history_preferences (
  user_id CHAR(36) PRIMARY KEY,
  save_history TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_history_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_reactions (
  user_id CHAR(36) NOT NULL,
  video_id CHAR(36) NOT NULL,
  reaction ENUM('like', 'dislike') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, video_id),
  INDEX idx_video_reactions_video_id (video_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id CHAR(36) PRIMARY KEY,
  video_id CHAR(36) NULL,
  post_id CHAR(36) NULL,
  parent_id CHAR(36) NULL,
  author_id CHAR(36) NOT NULL,
  text TEXT NOT NULL,
  likes INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_comments_video_id (video_id),
  INDEX idx_comments_post_id (post_id),
  INDEX idx_comments_parent_id (parent_id)
);

CREATE TABLE IF NOT EXISTS comment_reactions (
  user_id CHAR(36) NOT NULL,
  comment_id CHAR(36) NOT NULL,
  reaction ENUM('like') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, comment_id),
  INDEX idx_comment_reactions_comment_id (comment_id)
);

CREATE TABLE IF NOT EXISTS playlists (
  id CHAR(36) PRIMARY KEY,
  creator_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  visibility ENUM('public', 'private', 'unlisted') NOT NULL DEFAULT 'private',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_playlists_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_playlists_creator_id (creator_id)
);

CREATE TABLE IF NOT EXISTS playlist_videos (
  playlist_id CHAR(36) NOT NULL,
  video_id CHAR(36) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (playlist_id, video_id),
  INDEX idx_playlist_videos_video_id (video_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id CHAR(36) PRIMARY KEY,
  author_id CHAR(36) NOT NULL,
  text TEXT NOT NULL,
  image_url TEXT NULL,
  poll JSON NULL,
  likes INT NOT NULL DEFAULT 0,
  dislikes INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_posts_author_id (author_id)
);

CREATE TABLE IF NOT EXISTS post_reactions (
  user_id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  reaction ENUM('like', 'dislike') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  INDEX idx_post_reactions_post_id (post_id)
);

CREATE TABLE IF NOT EXISTS audio_tracks (
  id CHAR(36) PRIMARY KEY,
  uploader_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  genre VARCHAR(120) NOT NULL,
  mood VARCHAR(120) NOT NULL,
  duration VARCHAR(20) NOT NULL,
  url TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audio_tracks_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_audio_tracks_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  email_snapshot VARCHAR(191) NULL,
  page VARCHAR(255) NULL,
  message TEXT NOT NULL,
  attachment_bucket VARCHAR(120) NULL,
  attachment_object_key VARCHAR(255) NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_content_type VARCHAR(120) NULL,
  attachment_size_bytes BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_feedback_submissions_user_created_at (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS studio_ai_settings (
  user_id CHAR(36) PRIMARY KEY,
  provider_kind VARCHAR(40) NOT NULL,
  provider_label VARCHAR(120) NOT NULL,
  base_url TEXT NULL,
  model VARCHAR(191) NOT NULL,
  endpoint_mode VARCHAR(40) NOT NULL DEFAULT 'chat-completions',
  stream_enabled TINYINT(1) NOT NULL DEFAULT 1,
  encrypted_api_key TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_studio_ai_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_analytics_daily (
  video_id CHAR(36) NOT NULL,
  activity_date DATE NOT NULL,
  views_delta INT NOT NULL DEFAULT 0,
  likes_delta INT NOT NULL DEFAULT 0,
  dislikes_delta INT NOT NULL DEFAULT 0,
  comments_delta INT NOT NULL DEFAULT 0,
  shares_delta INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (video_id, activity_date),
  CONSTRAINT fk_video_analytics_daily_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_analytics_events (
  id CHAR(36) PRIMARY KEY,
  video_id CHAR(36) NOT NULL,
  actor_user_id CHAR(36) NULL,
  event_type ENUM('view', 'like', 'dislike', 'comment', 'share') NOT NULL,
  event_value SMALLINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_video_analytics_events_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  INDEX idx_video_analytics_events_video_created_at (video_id, created_at),
  INDEX idx_video_analytics_events_actor_created_at (actor_user_id, created_at)
);

CREATE TABLE IF NOT EXISTS ad_packages (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  placement_scope ENUM('home', 'search', 'both') NOT NULL,
  duration_days INT NOT NULL,
  impression_cap INT NOT NULL,
  price_paise INT NOT NULL,
  gst_percent DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ad_packages_active_order (active, display_order)
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id CHAR(36) PRIMARY KEY,
  owner_user_id CHAR(36) NOT NULL UNIQUE,
  channel_user_id CHAR(36) NOT NULL,
  package_id CHAR(36) NULL,
  status ENUM('draft', 'payment_pending', 'paid_pending_review', 'active', 'paused', 'rejected', 'completed', 'archived') NOT NULL DEFAULT 'draft',
  review_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  payment_status ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid',
  placement_scope ENUM('home', 'search', 'both') NOT NULL DEFAULT 'both',
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  destination_url TEXT NOT NULL,
  cta_label VARCHAR(60) NOT NULL DEFAULT 'Start now',
  budget_paise INT NOT NULL DEFAULT 0,
  tax_paise INT NOT NULL DEFAULT 0,
  total_paise INT NOT NULL DEFAULT 0,
  spend_paise INT NOT NULL DEFAULT 0,
  duration_days INT NOT NULL DEFAULT 0,
  impression_cap INT NOT NULL DEFAULT 0,
  total_impressions INT NOT NULL DEFAULT 0,
  total_clicks INT NOT NULL DEFAULT 0,
  total_dismissals INT NOT NULL DEFAULT 0,
  total_watch_previews INT NOT NULL DEFAULT 0,
  package_snapshot_json JSON NULL,
  review_notes TEXT NULL,
  rejection_reason_code VARCHAR(80) NULL,
  rejection_reason_label VARCHAR(120) NULL,
  rejection_custom_reason TEXT NULL,
  rejection_notify_mode ENUM('in_app', 'email', 'both') NULL,
  last_reviewed_at DATETIME NULL,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  paid_at DATETIME NULL,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ad_campaigns_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ad_campaigns_channel FOREIGN KEY (channel_user_id) REFERENCES channels(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ad_campaigns_package FOREIGN KEY (package_id) REFERENCES ad_packages(id) ON DELETE SET NULL,
  INDEX idx_ad_campaigns_status (status, review_status, payment_status),
  INDEX idx_ad_campaigns_window (start_at, end_at),
  INDEX idx_ad_campaigns_placement (placement_scope)
);

CREATE TABLE IF NOT EXISTS ad_creatives (
  campaign_id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  sponsor_name VARCHAR(120) NOT NULL,
  sponsor_domain VARCHAR(191) NOT NULL,
  video_storage_ref TEXT NOT NULL,
  thumbnail_storage_ref TEXT NOT NULL,
  extracted_thumbnail_storage_ref TEXT NULL,
  selected_thumbnail_source ENUM('extracted', 'custom') NOT NULL DEFAULT 'extracted',
  video_duration_seconds INT NOT NULL DEFAULT 0,
  video_width INT NOT NULL DEFAULT 0,
  video_height INT NOT NULL DEFAULT 0,
  video_mime_type VARCHAR(120) NOT NULL DEFAULT 'video/mp4',
  thumbnail_mime_type VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ad_creatives_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ad_orders (
  id CHAR(36) PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  package_id CHAR(36) NOT NULL,
  razorpay_order_id VARCHAR(191) NOT NULL UNIQUE,
  status ENUM('created', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'created',
  wallet_credit_paise INT NOT NULL DEFAULT 0,
  external_payable_paise INT NOT NULL DEFAULT 0,
  amount_paise INT NOT NULL,
  tax_paise INT NOT NULL DEFAULT 0,
  total_paise INT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  package_snapshot_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ad_orders_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ad_orders_package FOREIGN KEY (package_id) REFERENCES ad_packages(id) ON DELETE RESTRICT,
  INDEX idx_ad_orders_campaign (campaign_id, created_at)
);

CREATE TABLE IF NOT EXISTS ad_payments (
  id CHAR(36) PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  order_id CHAR(36) NOT NULL,
  razorpay_payment_id VARCHAR(191) NOT NULL UNIQUE,
  razorpay_signature VARCHAR(255) NULL,
  status ENUM('captured', 'authorized', 'failed', 'refunded') NOT NULL,
  amount_paise INT NOT NULL,
  raw_payload_json LONGTEXT NULL,
  captured_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ad_payments_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ad_payments_order FOREIGN KEY (order_id) REFERENCES ad_orders(id) ON DELETE CASCADE,
  INDEX idx_ad_payments_campaign (campaign_id, created_at)
);

CREATE TABLE IF NOT EXISTS ad_reviews (
  id CHAR(36) PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  reviewer_staff_id CHAR(36) NULL,
  reviewer_user_id CHAR(36) NULL,
  action ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  reason_code VARCHAR(80) NULL,
  reason_label_snapshot VARCHAR(120) NULL,
  custom_reason TEXT NULL,
  notify_mode ENUM('in_app', 'email', 'both') NULL,
  email_delivery_status VARCHAR(40) NULL,
  email_delivery_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ad_reviews_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_ad_reviews_reviewer_staff FOREIGN KEY (reviewer_staff_id) REFERENCES admin_staff_accounts(id) ON DELETE SET NULL,
  INDEX idx_ad_reviews_campaign_created_at (campaign_id, created_at)
);

CREATE TABLE IF NOT EXISTS user_ad_wallets (
  user_id CHAR(36) PRIMARY KEY,
  balance_paise INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_ad_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_ad_wallet_transactions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type ENUM('credit', 'debit') NOT NULL,
  amount_paise INT NOT NULL,
  balance_after_paise INT NOT NULL,
  reference_type VARCHAR(80) NOT NULL,
  reference_id VARCHAR(80) NOT NULL,
  related_campaign_id CHAR(36) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_ad_wallet_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_ad_wallet_transactions_campaign FOREIGN KEY (related_campaign_id) REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  UNIQUE KEY uq_user_ad_wallet_reference (user_id, reference_type, reference_id),
  INDEX idx_user_ad_wallet_transactions_user_created_at (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(191) NOT NULL,
  body TEXT NOT NULL,
  severity ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
  related_campaign_id CHAR(36) NULL,
  cta_label VARCHAR(120) NULL,
  cta_target TEXT NULL,
  metadata_json LONGTEXT NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_notifications_campaign FOREIGN KEY (related_campaign_id) REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  INDEX idx_user_notifications_user_created_at (user_id, created_at),
  INDEX idx_user_notifications_user_read_at (user_id, read_at)
);

CREATE TABLE IF NOT EXISTS ad_delivery_events (
  id CHAR(36) PRIMARY KEY,
  campaign_id CHAR(36) NOT NULL,
  event_type ENUM('impression', 'click', 'dismiss', 'watch') NOT NULL,
  surface ENUM('home', 'search') NOT NULL,
  viewer_user_id CHAR(36) NULL,
  viewer_key VARCHAR(191) NULL,
  search_query VARCHAR(255) NULL,
  event_cost_paise INT NOT NULL DEFAULT 0,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ad_delivery_events_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  INDEX idx_ad_delivery_events_campaign_created_at (campaign_id, created_at),
  INDEX idx_ad_delivery_events_viewer_created_at (viewer_user_id, viewer_key, created_at),
  INDEX idx_ad_delivery_events_surface_created_at (surface, created_at)
);

CREATE TABLE IF NOT EXISTS ad_analytics_daily (
  campaign_id CHAR(36) NOT NULL,
  activity_date DATE NOT NULL,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  dismissals INT NOT NULL DEFAULT 0,
  watch_previews INT NOT NULL DEFAULT 0,
  spend_paise INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id, activity_date),
  CONSTRAINT fk_ad_analytics_daily_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE
);
