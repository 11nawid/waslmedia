const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const APP_DIR = path.resolve(__dirname, '..', 'waslmedia');
const mysql = require(path.join(APP_DIR, 'node_modules', 'mysql2', 'promise'));
const bcrypt = require(path.join(APP_DIR, 'node_modules', 'bcryptjs'));
const dotenv = require(path.join(APP_DIR, 'node_modules', 'dotenv'));

dotenv.config({ path: path.join(APP_DIR, '.env.local') });
dotenv.config({ path: path.join(APP_DIR, '.env') });

const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const DEFAULT_PROFILE_PICTURE = '/ui-assets/u1x9';
const DEFAULT_BANNER = '/ui-assets/u8r4';
const DEFAULT_COUNT = Number.parseInt(process.argv[2] || '40', 10) || 40;
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

function readState() {
  ensureDataDir();
  if (!fs.existsSync(STATE_FILE)) {
    return { lastIndex: 0 };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return {
      lastIndex: Number.isFinite(parsed.lastIndex) ? parsed.lastIndex : 0,
    };
  } catch {
    return { lastIndex: 0 };
  }
}

function writeState(state) {
  ensureDataDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const prefixes = [
  'North',
  'Urban',
  'Aero',
  'Velvet',
  'Pixel',
  'Luna',
  'Blue',
  'Golden',
  'Nova',
  'Cedar',
  'Rogue',
  'Quiet',
  'Silver',
  'Mono',
  'Prime',
  'Echo',
  'Solar',
  'Daily',
  'Drift',
  'Vista',
];

const nouns = [
  'Studio',
  'Media',
  'Vision',
  'Stories',
  'Films',
  'Focus',
  'Journal',
  'Live',
  'Canvas',
  'Hub',
  'Room',
  'Works',
  'Lab',
  'Central',
  'Archive',
  'Network',
  'Stream',
  'Space',
  'Circle',
  'Wave',
];

const tails = ['', '', '', 'TV', 'HQ', 'Official', 'Now', 'Plus', 'Channel', 'Online'];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function buildDisplayName(index) {
  const prefix = prefixes[index % prefixes.length];
  const noun = nouns[Math.floor(index / prefixes.length) % nouns.length];
  const tail = tails[Math.floor(index / (prefixes.length * nouns.length)) % tails.length];
  return [prefix, noun, tail].filter(Boolean).join(' ');
}

function buildSeed(index) {
  const displayName = buildDisplayName(index);
  const handleBase = slugify(displayName);
  const suffix = String(index + 1).padStart(3, '0');
  const handle = `${handleBase}_${suffix}`;
  const email = `demo_${handle}@waslmedia.local`;
  const password = crypto.randomBytes(12).toString('base64url');

  return {
    id: crypto.randomUUID(),
    email,
    displayName,
    handle,
    password,
    profilePictureUrl: DEFAULT_PROFILE_PICTURE,
    bannerUrl: DEFAULT_BANNER,
  };
}

function formatTextOutput(records) {
  const lines = [
    `Generated at: ${new Date().toISOString()}`,
    `Count: ${records.length}`,
    'Passwords: unique strong random passwords per account',
    '',
  ];

  records.forEach((record, index) => {
    lines.push(`${index + 1}. ${record.displayName}`);
    lines.push(`   handle: @${record.handle}`);
    lines.push(`   email: ${record.email}`);
    lines.push(`   password: ${record.password}`);
    lines.push(`   user_id: ${record.id}`);
    lines.push('');
  });

  return lines.join('\n');
}

async function main() {
  logLine('START', `Preparing ${DEFAULT_COUNT} demo accounts...`);
  const state = readState();
  const startIndex = state.lastIndex;
  const batchStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputText = path.join(DATA_DIR, `created_accounts_${batchStamp}.txt`);
  const outputJson = path.join(DATA_DIR, `created_accounts_${batchStamp}.json`);
  const latestText = path.join(DATA_DIR, 'created_accounts_latest.txt');
  const latestJson = path.join(DATA_DIR, 'created_accounts_latest.json');
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const requested = Array.from({ length: DEFAULT_COUNT }, (_, index) => buildSeed(startIndex + index));
    const created = [];
    let skipped = 0;

    await db.beginTransaction();

    for (const seed of requested) {
      const [existingRows] = await db.query(
        'SELECT id FROM users WHERE email = ? OR handle = ? LIMIT 1',
        [seed.email, seed.handle],
      );

      if (existingRows.length > 0) {
        skipped += 1;
        logLine('ALREADY EXISTS', `${seed.displayName} (@${seed.handle})`);
        continue;
      }

      try {
        await db.query(
          `INSERT INTO users (id, email, password_hash, display_name, photo_url, handle)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            seed.id,
            seed.email,
            await bcrypt.hash(seed.password, 12),
            seed.displayName,
            seed.profilePictureUrl,
            seed.handle,
          ],
        );

        await db.query(
          `INSERT INTO channels (
            user_id, name, handle, profile_picture_url, banner_url, subscriber_count, description, contact_email, country, show_country
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, '', 0)`,
          [
            seed.id,
            seed.displayName,
            `@${seed.handle}`,
            seed.profilePictureUrl,
            seed.bannerUrl,
            'Demo channel generated for testing.',
            seed.email,
          ],
        );

        created.push(seed);
        logLine('CREATED', `${seed.displayName} (@${seed.handle})`);
      } catch (error) {
        logLine('FAILED', `${seed.displayName} (@${seed.handle})`);
        throw error;
      }
    }

    await db.commit();

    ensureDataDir();
    fs.writeFileSync(outputJson, JSON.stringify(created, null, 2));
    fs.writeFileSync(outputText, formatTextOutput(created));
    fs.writeFileSync(latestJson, JSON.stringify(created, null, 2));
    fs.writeFileSync(latestText, formatTextOutput(created));
    writeState({ lastIndex: startIndex + DEFAULT_COUNT });

    console.log('');
    logLine('DONE', `Created ${created.length} demo users`);
    logLine('SKIPPED', `${skipped} already existed`);
    logLine('BATCH', `Range ${startIndex + 1}-${startIndex + DEFAULT_COUNT}`);
    logLine('FILES', `${path.basename(outputText)}, ${path.basename(outputJson)}`);
    logLine('LATEST', `${path.basename(latestText)}, ${path.basename(latestJson)}`);
    logLine('PASSWORDS', 'Each account has its own strong random password');
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(`${status('ERROR')} Failed to create demo users:`, error.message || error);
  process.exitCode = 1;
});
