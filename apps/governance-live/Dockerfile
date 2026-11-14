FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/governance-console/package.json apps/governance-console/package-lock.json ./apps/governance-console/
COPY apps/governance-live/package.json apps/governance-live/package-lock.json ./apps/governance-live/
RUN npm ci --prefix apps/governance-console && npm ci --prefix apps/governance-live
COPY apps/governance-console/src ./apps/governance-console/src
COPY apps/governance-live ./apps/governance-live
WORKDIR /repo/apps/governance-live
RUN npm run build

FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3006 HOSTNAME=0.0.0.0
COPY --from=builder /repo/apps/governance-live/.next/standalone ./
COPY --from=builder /repo/apps/governance-live/.next/static ./apps/governance-live/.next/static
EXPOSE 3006
CMD ["node", "apps/governance-live/server.js"]
