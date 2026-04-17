# Setup Guide

This repository supports a few different local development workflows. The best choice depends on whether you want Docker to run only the backing services or the full app stack.

## Prerequisites

- Node.js 20+
- npm
- MySQL running locally or otherwise reachable from the app
- Docker Desktop if you want Docker-backed MinIO, Redis, or the production-style app container

## Environment files

There are two example env files in this repo:

- `infra/.env.example`
- `waslmedia/.env.example`

Copy them before you start:

```powershell
Copy-Item infra/.env.example infra/.env
Copy-Item waslmedia/.env.example waslmedia/.env.local
```

Replace every `change-me-*`, `replace-me-*`, and placeholder email or URL with values for your machine.

## Option 1: Hybrid local development

This is the easiest day-to-day setup for active app development.

- Run MinIO and Redis with Docker
- Run the Next.js app locally from `waslmedia/`
- Keep MySQL running separately on your machine

Start supporting services:

```powershell
cd infra
docker compose up -d minio createbuckets redis
```

Then start the app:

```powershell
cd ../waslmedia
npm install
npm run dev
```

App URL:

- `http://localhost:9002`

Service URLs:

- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Redis: `redis://localhost:6379`

## Option 2: Docker-based app and services

Use this when you want the app running more like a production container.

```powershell
cd infra
docker compose up -d --build
```

This starts:

- the app container
- the video-processing worker
- MinIO
- Redis
- the bucket bootstrap container

Default app URL:

- `http://localhost:3000`

## Option 3: Fully local app runtime

You can also run the app without Docker for the web server. The step-by-step guide lives in [../infra/RUN_WITHOUT_DOCKER.md](../infra/RUN_WITHOUT_DOCKER.md).

## Useful app commands

Run these from `waslmedia/`:

```powershell
npm run dev
npm run build
npm run start
npm run typecheck
npm run lint
npm run worker:video-processing
```

## Data and storage notes

- The app bootstraps the database schema on startup when possible.
- Media object references are stored in the database and served through application-controlled URLs.
- Redis is used for realtime behavior, queue coordination, and shared rate limiting.
- The background worker is required for video-processing flows outside the all-in-one Docker app setup.
