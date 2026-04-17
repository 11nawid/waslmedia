# Waslmedia

Waslmedia is a video publishing and advertising platform built with Next.js. This repository contains the main web app, local infrastructure helpers, demo account utilities, and supporting documentation for running the project safely in a public repository.

## Repository layout

- `waslmedia/`: main Next.js application
- `infra/`: Docker Compose setup, local service wiring, and infrastructure notes
- `users_test/`: demo account and subscription seed scripts
- `docs/`: repo-level setup and architecture documentation
- `legacy-root-assets/`: assets preserved from the repository's older root layout

## Quick start

1. Copy the example env files and replace placeholder values with your own local secrets.
2. Choose a development flow:
   - Docker-backed services: [infra/README.md](./infra/README.md)
   - Local app without Docker for the web server: [infra/RUN_WITHOUT_DOCKER.md](./infra/RUN_WITHOUT_DOCKER.md)
3. Install dependencies in `waslmedia/`:

```powershell
cd waslmedia
npm install
```

4. Start the app:

```powershell
npm run dev
```

The local development app runs on `http://localhost:9002`.

## Documentation

- [docs/README.md](./docs/README.md): documentation index
- [docs/setup.md](./docs/setup.md): setup flows and environment guidance
- [docs/architecture.md](./docs/architecture.md): high-level system overview
- [waslmedia/README.md](./waslmedia/README.md): app-specific commands and notes
- [infra/README.md](./infra/README.md): Docker-based setup

## Public repo safety

- Real `.env` files are ignored and should never be committed.
- Only sanitized `.env.example` files belong in the repository.
- Generated local artifacts such as `node_modules`, `.next`, logs, and `*.tsbuildinfo` stay out of version control.
- If you add a new secret-backed integration, update the relevant `.env.example` file and docs without publishing the real value.
