# Waslmedia

Waslmedia is a video publishing and advertising platform built with Next.js. This repository contains the main web app, local infrastructure helpers, demo account utilities, and supporting documentation for running the project safely in a public repository.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Stars](https://img.shields.io/github/stars/11nawid/waslmedia?style=social)](https://github.com/11nawid/waslmedia)
[![CI](https://img.shields.io/github/actions/workflow/status/11nawid/waslmedia/ci.yml?branch=main&label=ci)](https://github.com/11nawid/waslmedia/actions)

## Why this repo matters

- modern video platform architecture with Next.js, MySQL, Redis, and MinIO
- both app code and local infrastructure in one repo
- useful as a product repo, learning resource, and starting point for media-style platforms

## Support the project

- Star the repo on GitHub if you want to help it grow.
- Follow the builder on Instagram: [@11.skibidi](https://www.instagram.com/11.skibidi/)
- Share the project with people interested in video platforms, creator tools, and Next.js builds.

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
- [docs/repo-settings.md](./docs/repo-settings.md): recommended GitHub repo settings and hardening checklist
- [waslmedia/README.md](./waslmedia/README.md): app-specific commands and notes
- [infra/README.md](./infra/README.md): Docker-based setup

## What You Get

- a full-stack video platform codebase built with Next.js, React, MySQL, Redis, and MinIO
- setup docs for both Docker-based and local development flows
- GitHub workflows for CI, dependency updates, and code scanning
- community and support files for contributing, reporting issues, and following project updates
