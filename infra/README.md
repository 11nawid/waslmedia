# WaslMedia Docker Setup

This folder starts:

- Next.js app
- MinIO storage
- Redis
- video-processing worker

If you use Docker, you do not need to run the Next.js app separately.
When the app starts, it also tries to create the MySQL database and tables if they do not exist.

If you want to run the app without Docker, read:

- [RUN_WITHOUT_DOCKER.md](C:\Users\KRO\Downloads\projects to sell\waslmedia\infra\RUN_WITHOUT_DOCKER.md)

## URLs

- App: `http://localhost:3000`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Redis: `redis://localhost:6379`

## First time

1. Open terminal in the `infra` folder.
2. Run:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

Docker uses the app's existing env files for database and app secrets:

- `../waslmedia/.env`
- `../waslmedia/.env.local`

Compose only overrides the values that must change inside Docker:

- app URL and port to `http://localhost:3000`
- MinIO endpoint to `http://minio:9000`
- Redis URL to `redis://redis:6379`
- DB host to `host.docker.internal` by default

3. Open:

- `http://localhost:3000`
- `http://localhost:9001`

## Important simple answer

If you run:

```powershell
docker compose up -d
```

Docker starts both:

- the built Next.js app on port `3000`
- MinIO

You do not need to run `npm run dev` separately outside Docker.

## If Docker is already running and you change code

The Docker app now runs the production build, so app code changes need a rebuild:

```powershell
docker compose up -d --build app
```

If you changed dependencies, `package.json`, `package-lock.json`, Dockerfile, or env values:

```powershell
docker compose up -d --build app
```

If you want to fully rebuild everything:

```powershell
docker compose up -d --build
```

Start only Docker services while you keep the app in local dev mode:

```powershell
docker compose up -d minio createbuckets redis
```

## Daily commands

Start:

```powershell
docker compose up -d
```

Start and rebuild:

```powershell
docker compose up -d --build
```

Stop:

```powershell
docker compose stop
```

Stop and remove containers:

```powershell
docker compose down
```

Check logs:

```powershell
docker compose logs -f
```

Check only app logs:

```powershell
docker compose logs -f app
```

Check status:

```powershell
docker compose ps
```

Restart only app:

```powershell
docker compose up -d --build app
```

Restart only MinIO:

```powershell
docker compose restart minio
```

## Buckets

These buckets are auto-created:

- `profile`
- `banners`
- `videos`
- `thumbnails`
- `postimages`
- `freeaudio`
- `feedback`

All buckets are private in Phase 2. First-party media is now served through signed application URLs instead of anonymous MinIO URLs.

Create them again manually if needed:

```powershell
docker compose run --rm createbuckets
```

## MinIO login

- Username: `minioadmin`
- Password: `minioadmin123`

## Port split

- Docker app: `http://localhost:3000`
- Local non-Docker dev app: `http://localhost:9002`






we can run this after any change to build the update 
docker compose up -d --build app worker