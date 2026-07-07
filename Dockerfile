# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app

# --- Install all deps (incl. dev) for the build ------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Build the Next.js app ---------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Production-only deps (smaller runtime node_modules) ---------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Runtime image -----------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=32325

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json next.config.ts ./

RUN chown -R node:node /app
USER node

EXPOSE 32325

# The app is stateless — a 200 from the homepage means it's serving.
HEALTHCHECK --start-period=30s --interval=30s --timeout=5s CMD \
  node -e "fetch('http://localhost:'+(process.env.PORT||32325)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
