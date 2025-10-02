# Next.js Runtime Image Whitelist (Proxy Route Demo)

This demo shows how to enforce a **runtime-configurable image domain whitelist** in a Next.js app **without rebuilds or server-side rendering (SSR)**.

---

## Why is this necessary?

Next.js provides `images.domains`/`images.remotePatterns` settings in `next.config.js` for the `<Image>` component. However:

- `next.config.js` is evaluated **at build time**, not at runtime.
- Even if you use environment variables in `next.config.js`, any changes require a **full rebuild** to take effect.
- The old `publicRuntimeConfig` and `serverRuntimeConfig` features are deprecated and not recommended for new projects.

For containerised deployments (e.g., Docker), this is a problem because:
- You often want to **inject environment-specific settings at runtime** (e.g., staging vs production).
- Rebuilding the app for every environment defeats the purpose of immutable builds.

---

## Why not use a custom image loader?

I considered using a custom image loader in `next.config.js`, but it has limitations:

- The loader logic runs during **build time**
- If the page is statically optimised, the loader uses the whitelist from the build environment.
- To make the loader evaluate at runtime, you must use SSR (`getServerSideProps`), which we probably want to avoid.
- SSR adds complexity and performance overhead, and is not suitable for static hosting or CDN caching.

---

## The solution: Proxy route

Instead of relying on Next.js’ static image domain whitelist, in this demo we:
1. Disable Next.js image optimisation (`images.unoptimized = true`).
2. Create an API route (`/api/image-proxy`) that:
   - Validates the requested image URL against `IMAGE_WHITELIST` (a runtime env var).
   - Fetches the image server-side and streams it back to the browser.
3. The browser only ever requests images from your own origin, so the whitelist is enforced **at runtime**.

Benefits:
- No rebuilds required when changing allowed domains.
- Works in containerised environments where env vars are injected at runtime.
- Keeps security under your control (you can add size limits, content-type checks, etc.).
- Avoids SSR and keeps the app statically optimised.

**Note:** It's not necessary to disable image optimisation. It would be entirely possible to continue to use this feature for most things and only proxy images that require runtime domain whitelist enforcement.

---

## Environment variables

- `IMAGE_WHITELIST` — comma-separated list of allowed hostnames (exact match or subdomain).  

Example:

```bash
IMAGE_WHITELIST=www.ga.gov.au
IMAGE_WHITELIST=example.com,cdn.example.org
IMAGE_WHITELIST=.example.com    # allow all subdomains of example.com
```


---

## Run locally

```bash
npm install
npm run build
IMAGE_WHITELIST=www.ga.gov.au npm start
```

Open: http://localhost:3000

## Docker

Build:

```bash
docker build -t next-image-proxy-demo .
```

Run with runtime whitelist:

```bash
docker run --rm -p 3000:3000 -e IMAGE_WHITELIST=www.ga.gov.au next-image-proxy-demo
```

Change whitelist without rebuild:

```bash
docker run --rm -p 3000:3000 -e IMAGE_WHITELIST=example.com,cdn.example.org next-image-proxy-demo
```

## How to test

### Allowed 
Start with `IMAGE_WHITELIST=www.ga.gov.au`. The default https://www.ga.gov.au/__data/assets/file/0019/120466/geoscience_inline_Black.svg image in the UI should load when the "Load image" button is clicked. Images from other domains should show an error message.

### Blocked
Start with `IMAGE_WHITELIST=example.com` and try the default GA logo URL — you should see a clear error message in the UI.

## Notes

- The proxy currently buffers the entire image in memory (simple for demo). For production, consider streaming and adding size limits.
- Matching is exact or subdomain: host === entry or host.endsWith('.' + entryWithoutLeadingDot).
- You can easily extend this to:
    - Add wildcard support (*.example.com).
    - Enforce content-type and size limits.
    - Add caching headers or integrate with a CDN.

# Alternative Approach: Build at Container Startup
 
Another option might be  to evaluate `next.config.js` at runtime by running the build step (`npm run build`) when the container starts, rather than during the Docker image build. This allows environment variables like `IMAGE_WHITELIST` to be injected before the build, making them available to `next.config.js`.

## Benefits

- **Dynamic config injection:** Environment-specific settings (e.g., staging vs production) can be passed in at runtime.
- **Single image for all environments:** Avoids rebuilding the Docker image for each deployment target.
- **Simplifies CI/CD:** Build once, deploy anywhere with runtime flexibility.

## Trade-offs

- **Slower startup:** The container must build the app before serving it.
- **Higher resource usage:** Building requires CPU and memory at runtime.
- **No Docker layer caching:** You lose caching benefits for the build step.

## Example Dockerfile

```Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install

ENTRYPOINT ["sh", "-c", "npm run build && npm start"]
```

This approach makes `IMAGE_WHITELIST` available to `next.config.js` during the build, enabling dynamic domain whitelisting without SSR or proxying.

**Note:** This method is only useful if your app is not fully statically exported (`next export`). Static exports do not support runtime config injection.
