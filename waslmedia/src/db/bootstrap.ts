import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { databaseConfig } from './config';
import { dbPool } from './pool';
import { seedDefaultAdPackages } from '@/server/services/ads';

declare global {
  var __waslmediaBootstrapPromise: Promise<void> | undefined;
  var __waslmediaPostSchemaPromise: Promise<void> | undefined;
}

async function createDatabaseIfNeeded() {
  const adminPool = mysql.createPool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    connectionLimit: 2,
  });

  try {
    await adminPool.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await adminPool.end();
  }
}

async function applySchema() {
  const schemaPath = join(process.cwd(), 'src', 'db', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter(
      (statement) =>
        !/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i.test(statement) &&
        !/ADD\s+INDEX\s+IF\s+NOT\s+EXISTS/i.test(statement)
    );

  for (const statement of statements) {
    await dbPool.query(statement);
  }
}

async function columnExists(tableName: string, columnName: string) {
  const [rows] = await dbPool.query<Array<{ count: number } & mysql.RowDataPacket>>(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name = ?
       AND column_name = ?`,
    [databaseConfig.database, tableName, columnName]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function indexExists(tableName: string, indexName: string) {
  const [rows] = await dbPool.query<Array<{ count: number } & mysql.RowDataPacket>>(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = ?
       AND table_name = ?
       AND index_name = ?`,
    [databaseConfig.database, tableName, indexName]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  if (await columnExists(tableName, columnName)) {
    return;
  }

  try {
    await dbPool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Duplicate column name/i.test(message)) {
      return;
    }

    throw error;
  }
}

async function addIndexIfMissing(tableName: string, indexName: string, definition: string) {
  if (await indexExists(tableName, indexName)) {
    return;
  }

  try {
    await dbPool.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` ${definition}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Duplicate key name/i.test(message)) {
      return;
    }

    throw error;
  }
}

async function dropIndexIfExists(tableName: string, indexName: string) {
  if (!(await indexExists(tableName, indexName))) {
    return;
  }

  await dbPool.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
}

async function ensureWalletSchema() {
  await addColumnIfMissing('ad_orders', 'wallet_credit_paise', 'INT NOT NULL DEFAULT 0');
  await addColumnIfMissing('ad_orders', 'external_payable_paise', 'INT NOT NULL DEFAULT 0');

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS user_ad_wallets (
      user_id CHAR(36) PRIMARY KEY,
      balance_paise INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_ad_wallets_user_bootstrap FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbPool.query(`
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
      CONSTRAINT fk_user_ad_wallet_transactions_user_bootstrap FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_ad_wallet_transactions_campaign_bootstrap FOREIGN KEY (related_campaign_id) REFERENCES ad_campaigns(id) ON DELETE SET NULL,
      UNIQUE KEY uq_user_ad_wallet_reference_bootstrap (user_id, reference_type, reference_id),
      INDEX idx_user_ad_wallet_transactions_user_created_at_bootstrap (user_id, created_at)
    )
  `);
}

async function applyPostSchemaMigrations() {
  await dbPool.query(`
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
    )
  `);

  await addColumnIfMissing('api_docs_developers', 'docs_access_json', 'LONGTEXT NULL');

  await dbPool.query(`
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
    )
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS admin_staff_permission_overrides (
      id CHAR(36) PRIMARY KEY,
      staff_id CHAR(36) NOT NULL,
      permission_key VARCHAR(120) NOT NULL,
      effect ENUM('allow', 'deny') NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_admin_staff_permission_override (staff_id, permission_key)
    )
  `);

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS admin_staff_audit_log (
      id CHAR(36) PRIMARY KEY,
      actor_staff_id CHAR(36) NULL,
      action VARCHAR(120) NOT NULL,
      target_type VARCHAR(120) NULL,
      target_id VARCHAR(120) NULL,
      metadata_json LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_staff_audit_action_created_at (action, created_at),
      INDEX idx_admin_staff_audit_target_created_at (target_type, target_id, created_at)
    )
  `);

  await addColumnIfMissing('admin_staff_accounts', 'notes', 'TEXT NULL');
  await addColumnIfMissing('admin_staff_accounts', 'docs_access_json', 'LONGTEXT NULL');
  await addColumnIfMissing('admin_staff_accounts', 'last_login_at', 'DATETIME NULL');

  await dbPool.query(`
    INSERT INTO admin_staff_accounts (
      id, name, username, email, password_hash, role, status, notes, docs_access_json, created_at, updated_at
    )
    SELECT
      d.id,
      d.name,
      d.username,
      d.email,
      d.password_hash,
      CASE
        WHEN d.role = 'admin' THEN 'super_admin'
        ELSE 'developer'
      END,
      d.status,
      NULL,
      d.docs_access_json,
      d.created_at,
      d.updated_at
    FROM api_docs_developers d
    LEFT JOIN admin_staff_accounts s ON s.id = d.id
    WHERE s.id IS NULL
  `);

  await addColumnIfMissing('feedback_submissions', 'attachment_bucket', 'VARCHAR(120) NULL');
  await addColumnIfMissing('feedback_submissions', 'attachment_object_key', 'VARCHAR(255) NULL');
  await addColumnIfMissing('feedback_submissions', 'attachment_name', 'VARCHAR(255) NULL');
  await addColumnIfMissing('feedback_submissions', 'attachment_content_type', 'VARCHAR(120) NULL');
  await addColumnIfMissing('feedback_submissions', 'attachment_size_bytes', 'BIGINT NULL');
  await addColumnIfMissing('sessions', 'last_seen_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  await addColumnIfMissing('sessions', 'revoked_at', 'DATETIME NULL');
  await addColumnIfMissing('sessions', 'user_agent_hash', 'CHAR(64) NULL');
  await addColumnIfMissing('sessions', 'ip_hash', 'CHAR(64) NULL');
  await addColumnIfMissing('sessions', 'rotated_from_session_id', 'CHAR(36) NULL');
  await addIndexIfMissing('sessions', 'idx_sessions_revoked_at', '(`revoked_at`)');

  await addColumnIfMissing('video_analytics_events', 'traffic_source', 'VARCHAR(80) NULL');
  await addColumnIfMissing('video_analytics_events', 'viewer_country', 'VARCHAR(120) NULL');
  await addColumnIfMissing('video_analytics_events', 'viewer_key', 'VARCHAR(120) NULL');
  await addColumnIfMissing('video_analytics_events', 'device_type', 'VARCHAR(40) NULL');
  await addIndexIfMissing('video_analytics_events', 'idx_video_analytics_events_video_type_created_at', '(`video_id`, `event_type`, `created_at`)');
  await addIndexIfMissing('video_analytics_events', 'idx_video_analytics_events_video_source_created_at', '(`video_id`, `traffic_source`, `created_at`)');
  await addIndexIfMissing('video_analytics_events', 'idx_video_analytics_events_video_country_created_at', '(`video_id`, `viewer_country`, `created_at`)');
  await addIndexIfMissing('video_analytics_events', 'idx_video_analytics_events_video_viewer_created_at', '(`video_id`, `viewer_key`, `created_at`)');
  await addIndexIfMissing('video_analytics_events', 'idx_video_analytics_events_actor_type_created_at', '(`actor_user_id`, `event_type`, `created_at`)');

  await addColumnIfMissing('subscription_events', 'source_context', 'VARCHAR(80) NULL');
  await addColumnIfMissing('subscription_events', 'subscriber_country', 'VARCHAR(120) NULL');
  await addIndexIfMissing('subscription_events', 'idx_subscription_events_channel_source_created_at', '(`channel_user_id`, `source_context`, `created_at`)');
  await addIndexIfMissing('subscription_events', 'idx_subscription_events_channel_country_created_at', '(`channel_user_id`, `subscriber_country`, `created_at`)');

  await addColumnIfMissing('studio_ai_settings', 'endpoint_mode', "VARCHAR(40) NOT NULL DEFAULT 'chat-completions'");
  await addColumnIfMissing('studio_ai_settings', 'stream_enabled', 'TINYINT(1) NOT NULL DEFAULT 1');
  await addColumnIfMissing('ad_reviews', 'reviewer_staff_id', 'CHAR(36) NULL');
  await addColumnIfMissing('ad_reviews', 'reason_code', 'VARCHAR(80) NULL');
  await addColumnIfMissing('ad_reviews', 'reason_label_snapshot', 'VARCHAR(120) NULL');
  await addColumnIfMissing('ad_reviews', 'custom_reason', 'TEXT NULL');
  await addColumnIfMissing('ad_reviews', 'notify_mode', "ENUM('in_app', 'email', 'both') NULL");
  await addColumnIfMissing('ad_reviews', 'email_delivery_status', 'VARCHAR(40) NULL');
  await addColumnIfMissing('ad_reviews', 'email_delivery_error', 'TEXT NULL');
  await addIndexIfMissing('ad_reviews', 'idx_ad_reviews_reviewer_staff_created_at', '(`reviewer_staff_id`, `created_at`)');
  await addColumnIfMissing('ad_campaigns', 'rejection_reason_code', 'VARCHAR(80) NULL');
  await addColumnIfMissing('ad_campaigns', 'rejection_reason_label', 'VARCHAR(120) NULL');
  await addColumnIfMissing('ad_campaigns', 'rejection_custom_reason', 'TEXT NULL');
  await addColumnIfMissing('ad_campaigns', 'rejection_notify_mode', "ENUM('in_app', 'email', 'both') NULL");
  await addColumnIfMissing('ad_campaigns', 'last_reviewed_at', 'DATETIME NULL');

  await dbPool.query(`
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
      INDEX idx_user_notifications_user_created_at (user_id, created_at),
      INDEX idx_user_notifications_user_read_at (user_id, read_at)
    )
  `);

  await ensureWalletSchema();

  await dbPool.query(`
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
      CONSTRAINT fk_upload_media_metadata_user_bootstrap FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uq_upload_media_metadata_user_bucket_object_key_hash_bootstrap (user_id, bucket, object_key_hash),
      INDEX idx_upload_media_metadata_user_created_at_bootstrap (user_id, created_at)
    )
  `);
  await addColumnIfMissing('upload_media_metadata', 'object_key_hash', "CHAR(64) NOT NULL DEFAULT ''");
  await dbPool.query(`
    UPDATE upload_media_metadata
    SET object_key_hash = SHA2(object_key, 256)
    WHERE object_key_hash = ''
  `);
  await dropIndexIfExists('upload_media_metadata', 'uq_upload_media_metadata_user_bucket_object_key_bootstrap');
  await dropIndexIfExists('upload_media_metadata', 'uq_upload_media_metadata_user_bucket_object_key');
  await addIndexIfMissing(
    'upload_media_metadata',
    'uq_upload_media_metadata_user_bucket_object_key_hash_bootstrap',
    '(`user_id`, `bucket`, `object_key_hash`)'
  );

  await addIndexIfMissing('videos', 'idx_videos_visibility_created_at', '(`visibility`, `created_at`)');
  await addIndexIfMissing('videos', 'idx_videos_author_created_at', '(`author_id`, `created_at`)');
  await addIndexIfMissing('videos', 'idx_videos_author_visibility_created_at', '(`author_id`, `visibility`, `created_at`)');
  await addIndexIfMissing('videos', 'idx_videos_author_category_created_at', '(`author_id`, `category`, `created_at`)');
  await addIndexIfMissing('videos', 'idx_videos_visibility_view_count_created_at', '(`visibility`, `view_count`, `created_at`)');
  await addIndexIfMissing('users', 'idx_users_email', '(`email`)');
  await addIndexIfMissing('users', 'idx_users_handle', '(`handle`)');
  await addIndexIfMissing('channels', 'idx_channels_handle', '(`handle`)');
  await seedDefaultAdPackages();
}

async function bootstrapDatabase() {
  await createDatabaseIfNeeded();
  await applySchema();
}

export async function ensureDatabaseSetup() {
  if (!global.__waslmediaBootstrapPromise) {
    global.__waslmediaBootstrapPromise = bootstrapDatabase().catch((error) => {
      global.__waslmediaBootstrapPromise = undefined;
      throw error;
    });
  }

  await global.__waslmediaBootstrapPromise;

  if (!global.__waslmediaPostSchemaPromise) {
    global.__waslmediaPostSchemaPromise = applyPostSchemaMigrations().catch((error) => {
      global.__waslmediaPostSchemaPromise = undefined;
      throw error;
    });
  }

  return global.__waslmediaPostSchemaPromise;
}
