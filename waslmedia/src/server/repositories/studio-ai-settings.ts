import type { RowDataPacket } from 'mysql2';
import { dbPool } from '@/db/pool';
import { databaseConfig } from '@/db/config';

export interface StudioAiSettingsRow extends RowDataPacket {
  user_id: string;
  provider_kind: string;
  provider_label: string;
  base_url: string | null;
  model: string;
  endpoint_mode: string;
  stream_enabled: number;
  encrypted_api_key: string;
  created_at: Date | string;
  updated_at: Date | string;
}

async function getStudioAiColumnSupport() {
  return dbPool
    .query<Array<{ column_name: string } & RowDataPacket>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = ?
         AND table_name = 'studio_ai_settings'
         AND column_name IN ('endpoint_mode', 'stream_enabled')`,
      [databaseConfig.database]
    )
    .then(([rows]) => {
      const names = new Set(rows.map((row) => row.column_name));
      return {
        endpointMode: names.has('endpoint_mode'),
        streamEnabled: names.has('stream_enabled'),
      };
    })
    .catch(() => ({
      endpointMode: false,
      streamEnabled: false,
    }));
}

export async function findStudioAiSettingsByUserId(userId: string) {
  const support = await getStudioAiColumnSupport();
  const selectEndpointMode = support.endpointMode
    ? 'endpoint_mode'
    : "'chat-completions' AS endpoint_mode";
  const selectStreamEnabled = support.streamEnabled
    ? 'stream_enabled'
    : '1 AS stream_enabled';

  const [rows] = await dbPool.query<StudioAiSettingsRow[]>(
    `SELECT user_id, provider_kind, provider_label, base_url, model, ${selectEndpointMode}, ${selectStreamEnabled}, encrypted_api_key, created_at, updated_at
     FROM studio_ai_settings
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

export async function upsertStudioAiSettings(input: {
  userId: string;
  providerKind: string;
  providerLabel: string;
  baseUrl?: string | null;
  model: string;
  endpointMode: string;
  streamEnabled: boolean;
  encryptedApiKey: string;
}) {
  const support = await getStudioAiColumnSupport();
  const columns = ['user_id', 'provider_kind', 'provider_label', 'base_url', 'model'];
  const values = ['?', '?', '?', '?', '?'];
  const updates = [
    'provider_kind = VALUES(provider_kind)',
    'provider_label = VALUES(provider_label)',
    'base_url = VALUES(base_url)',
    'model = VALUES(model)',
  ];
  const params: Array<string | number | null> = [
    input.userId,
    input.providerKind,
    input.providerLabel,
    input.baseUrl || null,
    input.model,
  ];

  if (support.endpointMode) {
    columns.push('endpoint_mode');
    values.push('?');
    updates.push('endpoint_mode = VALUES(endpoint_mode)');
    params.push(input.endpointMode);
  }

  if (support.streamEnabled) {
    columns.push('stream_enabled');
    values.push('?');
    updates.push('stream_enabled = VALUES(stream_enabled)');
    params.push(input.streamEnabled ? 1 : 0);
  }

  columns.push('encrypted_api_key');
  values.push('?');
  updates.push('encrypted_api_key = VALUES(encrypted_api_key)');
  params.push(input.encryptedApiKey);

  await dbPool.query(
    `INSERT INTO studio_ai_settings (${columns.join(', ')})
     VALUES (${values.join(', ')})
     ON DUPLICATE KEY UPDATE
       ${updates.join(', ')}`,
    params
  );

  return findStudioAiSettingsByUserId(input.userId);
}
