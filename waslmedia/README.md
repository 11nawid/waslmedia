
# Waslmedia App

Waslmedia is a Next.js video platform app backed by MySQL for data, MinIO for file storage, and cookie-based app auth.

## Stack

- Next.js App Router
- MySQL
- MinIO
- Redis
- Tailwind CSS
- shadcn/ui
- Genkit

## Local setup

- Docker and storage commands: [../infra/README.md](../infra/README.md)
- Run without Docker: [../infra/RUN_WITHOUT_DOCKER.md](../infra/RUN_WITHOUT_DOCKER.md)

## Notes

- The app bootstraps the database schema on startup if the database or tables do not exist yet.
- Phase 2 uses Redis for realtime fan-out, queueing, and shared rate limiting. Run the web app and `npm run worker:video-processing` together outside Docker.
- Protected media is stored as `storage://bucket/objectKey` in the database and delivered to the browser through signed app URLs.
- Legacy public MinIO URLs can be backfilled with `npm run storage:backfill-refs`.
- API documentation is available only in development at `/api-docs`.
- Preferred public channel URLs now use the handle format like `/@afnawid`.
- Legacy channel routes like `/channel/@afnawid` and `/channel/<channel-id>` are still supported for compatibility.

## SEO

- Public crawl setup now includes `/robots.txt` and `/sitemap.xml`.
- Canonical public channels use the handle route like `/@channelhandle`.
- Legacy `/channel/...` URLs redirect to the canonical handle URL when possible.
- Auth, studio, search, feedback, API, and other private utility surfaces are marked `noindex`.
- Search Console and Bing inspection guidance is documented in [SEO_README.md](./SEO_README.md).
