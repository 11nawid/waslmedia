# Contributing to Waslmedia

Thanks for taking the time to contribute.

## Before you start

- Read the main [README.md](./README.md) and setup docs.
- Open an issue before large changes so the direction is clear.
- Keep security and secret-handling in mind when touching config or auth-related code.

## Local workflow

1. Fork the repo or create a branch from `main`.
2. Install dependencies in `waslmedia/`.
3. Use the documented setup flow from [docs/setup.md](./docs/setup.md).
4. Make focused changes with clear commit messages.

## Pull request expectations

- Explain what changed and why.
- Link related issues when possible.
- Include screenshots for UI changes.
- Mention any env, migration, or operational impact.
- Do not commit real secrets, tokens, or local `.env` files.

## Code quality

- Keep changes scoped.
- Follow the existing project structure.
- Prefer readable code over clever code.
- Update docs when behavior, setup, or public APIs change.

## Security

If you find a security issue, do not open a public issue first. Follow [SECURITY.md](./SECURITY.md).
