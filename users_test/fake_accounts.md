# Demo User Scripts

This folder now uses direct scripts instead of manual phpMyAdmin SQL.

Files:

- [index.js](C:\Users\KRO\Downloads\projects%20to%20sell\waslmedia\users_test\index.js)
- [subscriber.js](C:\Users\KRO\Downloads\projects%20to%20sell\waslmedia\users_test\subscriber.js)

The scripts read your existing app DB config from:

- `waslmedia/.env.local`
- `waslmedia/.env`

## What `index.js` does

Running `index.js`:

- creates realistic demo/test users directly in the database
- creates matching channel rows
- uses more natural channel names and handles
- creates a fresh unique batch on every run
- writes all created users to:
  - `users_test/data/created_accounts_<timestamp>.txt`
  - `users_test/data/created_accounts_<timestamp>.json`
  - latest copies:
    - `users_test/data/created_accounts_latest.txt`
    - `users_test/data/created_accounts_latest.json`

Run:

```powershell
cd "C:\Users\KRO\Downloads\projects to sell\waslmedia\users_test"
node index.js
```

Optional custom count:

```powershell
node index.js 100
```

Passwords are generated automatically per account as strong random values and saved in `created_accounts.txt`.

## What `subscriber.js` does

Running `subscriber.js`:

- reads only the newest batch from `users_test/data/created_accounts_latest.json`
- subscribes them to a target channel
- inserts `subscription_events`
- updates `channels.subscriber_count`
- writes the subscribed list to:
  - `users_test/data/subscribed_accounts_<timestamp>.txt`
  - latest copy:
    - `users_test/data/subscribed_accounts_latest.txt`

Default target:

```powershell
node subscriber.js
```

That targets:

```text
@nawid
```

Custom target:

```powershell
node subscriber.js @somehandle
```

## Notes

- `index.js` skips users that already exist by email or handle
- `subscriber.js` uses only the newest created batch and skips users already subscribed to the target channel
- the scripts use your current default internal asset URLs:
  - profile: `/ui-assets/u1x9`
  - banner: `/ui-assets/u8r4`
