const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const APP_DIR = path.resolve(__dirname, '..', 'waslmedia');
const mysql = require(path.join(APP_DIR, 'node_modules', 'mysql2', 'promise'));
const dotenv = require(path.join(APP_DIR, 'node_modules', 'dotenv'));

dotenv.config({ path: path.join(APP_DIR, '.env.local') });
dotenv.config({ path: path.join(APP_DIR, '.env') });

const DATA_DIR = path.join(__dirname, 'data');
const INPUT_JSON = path.join(DATA_DIR, 'created_accounts_latest.json');
const TARGET_HANDLE = process.argv[2] || '@nawid';
const STATUS_WIDTH = 18;

function status(label) {
  return `[${label.padEnd(STATUS_WIDTH, ' ')}]`;
}

function logLine(label, message) {
  console.log(`${status(label)} ${message}`);
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function formatOutput(targetHandle, subscribed, subscriberCount) {
  const lines = [
    `Target channel: ${targetHandle}`,
    `Subscribed at: ${new Date().toISOString()}`,
    `New subscriptions: ${subscribed.length}`,
    `Current subscriber count: ${subscriberCount}`,
    '',
  ];

  subscribed.forEach((record, index) => {
    lines.push(`${index + 1}. ${record.displayName}`);
    lines.push(`   handle: @${record.handle}`);
    lines.push(`   email: ${record.email}`);
    lines.push(`   user_id: ${record.id}`);
    lines.push('');
  });

  return lines.join('\n');
}

async function main() {
  logLine('START', `Preparing subscriptions for ${TARGET_HANDLE}...`);
  ensureDataDir();
  if (!fs.existsSync(INPUT_JSON)) {
    throw new Error('data/created_accounts_latest.json not found. Run index.js first.');
  }

  const createdAccounts = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8'));
  const batchStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputText = path.join(DATA_DIR, `subscribed_accounts_${batchStamp}.txt`);
  const latestText = path.join(DATA_DIR, 'subscribed_accounts_latest.txt');
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [channelRows] = await db.query(
      'SELECT user_id, subscriber_count FROM channels WHERE handle = ? LIMIT 1',
      [TARGET_HANDLE],
    );

    if (!channelRows.length) {
      throw new Error(`Channel ${TARGET_HANDLE} was not found.`);
    }

    const targetUserId = channelRows[0].user_id;
    const subscribed = [];
    let skipped = 0;

    await db.beginTransaction();

    for (const account of createdAccounts) {
      const [subscriptionRows] = await db.query(
        'SELECT subscriber_id FROM subscriptions WHERE subscriber_id = ? AND channel_user_id = ? LIMIT 1',
        [account.id, targetUserId],
      );

      if (subscriptionRows.length > 0) {
        skipped += 1;
        logLine('ALREADY SUBBED', `${account.displayName} (@${account.handle})`);
        continue;
      }

      try {
        await db.query(
          'INSERT INTO subscriptions (subscriber_id, channel_user_id, created_at) VALUES (?, ?, NOW())',
          [account.id, targetUserId],
        );

        await db.query(
          'INSERT INTO subscription_events (id, subscriber_id, channel_user_id, change_value, created_at) VALUES (?, ?, ?, 1, NOW())',
          [crypto.randomUUID(), account.id, targetUserId],
        );

        subscribed.push(account);
        logLine('SUBSCRIBED', `${account.displayName} (@${account.handle}) -> ${TARGET_HANDLE}`);
      } catch (error) {
        logLine('FAILED', `${account.displayName} (@${account.handle})`);
        throw error;
      }
    }

    if (subscribed.length > 0) {
      await db.query(
        'UPDATE channels SET subscriber_count = subscriber_count + ? WHERE user_id = ?',
        [subscribed.length, targetUserId],
      );
    }

    await db.commit();

    const [freshRows] = await db.query(
      'SELECT subscriber_count FROM channels WHERE user_id = ? LIMIT 1',
      [targetUserId],
    );

    const subscriberCount = freshRows[0]?.subscriber_count || 0;
    fs.writeFileSync(outputText, formatOutput(TARGET_HANDLE, subscribed, subscriberCount));
    fs.writeFileSync(latestText, formatOutput(TARGET_HANDLE, subscribed, subscriberCount));

    console.log('');
    logLine('DONE', `Subscribed ${subscribed.length} demo users to ${TARGET_HANDLE}`);
    logLine('SKIPPED', `${skipped} already subscribed`);
    logLine('COUNT', `Current subscriber count: ${subscriberCount}`);
    logLine('FILE', path.basename(outputText));
    logLine('LATEST', path.basename(latestText));
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(`${status('ERROR')} Failed to subscribe demo users:`, error.message || error);
  process.exitCode = 1;
});
