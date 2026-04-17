
# Waslmedia App

This folder contains the main Next.js application for Waslmedia.

## Stack

- Next.js App Router
- React 19
- MySQL
- MinIO
- Redis
- Tailwind CSS
- shadcn/ui
- Genkit

## Common commands

Run these from this folder:

```powershell
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm run worker:video-processing
```

## Local setup

- Docker-backed services: [../infra/README.md](../infra/README.md)
- Local app flow without Docker for the web server: [../infra/RUN_WITHOUT_DOCKER.md](../infra/RUN_WITHOUT_DOCKER.md)
- Repo-level setup guide: [../docs/setup.md](../docs/setup.md)

## Notes

- The app bootstraps the database schema on startup if the database or tables do not exist yet.
- Redis is used for realtime fan-out, queueing, and shared rate limiting.
- Run the web app and `npm run worker:video-processing` together outside Docker if you need background media processing.
- Protected media is stored as `storage://bucket/objectKey` in the database and delivered through application-controlled URLs.
- Legacy public MinIO URLs can be backfilled with `npm run storage:backfill-refs`.
- API documentation is available only in development at `/api-docs`.
- Preferred public channel URLs use the handle format like `/@afnawid`.

## SEO

- Public crawl setup includes `/robots.txt` and `/sitemap.xml`.
- Canonical public channels use the handle route like `/@channelhandle`.
- Legacy `/channel/...` URLs redirect to the canonical handle URL when possible.
- Auth, studio, search, feedback, API, and other private utility surfaces are marked `noindex`.
- Search Console and Bing inspection guidance is documented in [SEO_README.md](./SEO_README.md).
