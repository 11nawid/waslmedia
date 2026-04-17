# Users Test Scripts

This folder contains two database seeding scripts for your Waslmedia app.

Files:

- [index.js](C:\Users\KRO\Downloads\projects%20to%20sell\waslmedia\users_test\index.js)
- [subscriber.js](C:\Users\KRO\Downloads\projects%20to%20sell\waslmedia\users_test\subscriber.js)
- [fake_accounts.md](C:\Users\KRO\Downloads\projects%20to%20sell\waslmedia\users_test\fake_accounts.md)

## 1. Create demo users

Run:

```powershell
cd "C:\Users\KRO\Downloads\projects to sell\waslmedia\users_test"
node index.js
```

Optional custom count:

```powershell
node index.js 100
```

What it does:

- creates demo users directly in your database
- creates matching channel rows
- generates more realistic channel names and handles
- creates a fresh unique batch on every run
- writes the created accounts to:
  - `users_test/data/created_accounts_<timestamp>.txt`
  - `users_test/data/created_accounts_<timestamp>.json`
  - latest copies:
    - `users_test/data/created_accounts_latest.txt`
    - `users_test/data/created_accounts_latest.json`

The text file includes:

- channel name
- handle
- email
- password
- user id

Passwords are generated automatically per account as strong random values.

## 2. Subscribe those demo users to `@nawid`

Run:

```powershell
node subscriber.js
```

That subscribes the users saved in `created_accounts.json` to:

```text
@nawid
```

What it does:

- reads only the newest batch from `users_test/data/created_accounts_latest.json`
- subscribes them to `@nawid`
- inserts `subscription_events`
- updates the target channel subscriber count
- writes the subscribed list to:
  - `users_test/data/subscribed_accounts_<timestamp>.txt`
  - latest copy:
    - `users_test/data/subscribed_accounts_latest.txt`

## Notes

- `index.js` only creates users and writes the account list
- `subscriber.js` only subscribes the newest batch created by the last `index.js` run
- both scripts use your existing app DB config from:
  - `waslmedia/.env.local`
  - `waslmedia/.env`
