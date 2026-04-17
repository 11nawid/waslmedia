# Waslmedia Docker Setup

This folder contains the Docker Compose setup for local Waslmedia services.

## What it starts

- Next.js app container
- video-processing worker
- MinIO storage
- Redis
- bucket bootstrap container

If you want the web app to run locally instead of in Docker, use [RUN_WITHOUT_DOCKER.md](./RUN_WITHOUT_DOCKER.md).

## First-time setup

1. Copy the infra example env file:

```powershell
Copy-Item .env.example .env
```

2. Review and replace placeholder values in `.env`.

3. Make sure the app env files exist:

- `../waslmedia/.env` or
- `../waslmedia/.env.local`

4. Start the stack:

```powershell
docker compose up -d --build
docker compose ps
```

## Default URLs

- App: `http://localhost:3000`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Redis: `redis://localhost:6379`

## How config is wired

Docker reads from:

- `infra/.env`
- `waslmedia/.env`
- `waslmedia/.env.local`

Compose overrides container-only values such as:

- app URL and port
- MinIO endpoint inside Docker
- Redis URL inside Docker
- MySQL host inside Docker

## Common commands

Start:

```powershell
docker compose up -d
```

Start and rebuild:

```powershell
docker compose up -d --build
```

Rebuild only the app and worker after code or dependency changes:

```powershell
docker compose up -d --build app worker
```

Start only support services for local app development:

```powershell
docker compose up -d minio createbuckets redis
```

Stop:

```powershell
docker compose stop
```

Remove containers:

```powershell
docker compose down
```

Logs:

```powershell
docker compose logs -f
```

## Buckets

These buckets are created automatically:

- `profile`
- `banners`
- `videos`
- `thumbnails`
- `postimages`
- `freeaudio`
- `feedback`

All buckets are private in the current local setup. Media is served through the application layer rather than anonymous object URLs.

Recreate them manually if needed:

```powershell
docker compose run --rm createbuckets
```

## Port split

- Docker app: `http://localhost:3000`
- Local non-Docker dev app: `http://localhost:9002`
