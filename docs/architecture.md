# Architecture Overview

Waslmedia is organized as a monorepo-style repository with the main application and its local infrastructure helpers kept side by side.

## Main components

- `waslmedia/`: Next.js App Router application, API routes, UI, server services, and worker code
- `infra/`: local Docker Compose services for the app, worker, MinIO, Redis, and bucket initialization
- `users_test/`: scripts for creating demo users and seeded subscription activity

## Runtime pieces

### Web app

The Next.js application handles:

- public pages
- studio and authenticated flows
- API endpoints
- auth/session handling
- playback and media URL mediation
- SEO surfaces such as `robots.txt` and sitemap generation

### Database

MySQL stores:

- users and sessions
- channels, videos, playlists, and comments
- analytics and subscriptions
- ad and payment-related records
- metadata pointing to storage objects

### Object storage

MinIO is used for media and related assets such as:

- profile images
- banners
- videos
- thumbnails
- feedback uploads

The current repo setup treats these buckets as private and serves access through the application layer instead of anonymous public object URLs.

### Redis and worker

Redis supports:

- realtime fan-out
- rate limiting
- queue/state coordination

The background worker processes video-related tasks and should run alongside the app for features that depend on asynchronous media work.

## Application structure

Inside `waslmedia/src/` the code is broadly divided into:

- `app/`: routes, pages, layouts, and API handlers
- `components/`: reusable UI and feature components
- `db/`: schema/bootstrap helpers
- `hooks/`: client-side state and behavior hooks
- `lib/`: shared domain logic and client helpers
- `server/`: repositories, services, workers, and server utilities

## Deployment-minded notes

- The app has both local dev and container-oriented startup paths.
- Build-time and runtime config both rely on env files.
- The same repository supports both application development and local service orchestration.
