# Nuxflare - Durable WebSockets

A Nuxt real-time chat demo using Cloudflare Durable Objects for WebSockets, deployed with [Nuxflare](https://nuxflare.com).

## Project Structure

- A Nuxt application for the frontend
- WebSocket functionality powered by Cloudflare Durable Objects
- Nuxflare handling the deployment process

## Local Development

1. Install dependencies:

```bash
bun install
```

2. Start the development server:

```bash
bun run dev
```

## Deployment

To deploy to Cloudflare Workers using Nuxflare:

```bash
bun nuxflare deploy
```

This will prompt you to create and set up a `CLOUDFLARE_API_TOKEN` if one isn't already configured.

## GitHub Actions

We've also used Nuxflare to automatically configure GitHub Actions for continuous deployment.

With this preset, pushing to the main branch automatically deploys to the production environment.

The production domain is configured through GitHub Actions using the `PROD_DOMAIN` environment variable.
