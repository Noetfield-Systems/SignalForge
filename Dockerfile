# Dedicated GitHub-backed SignalForge application, replacing the limited Railway Function bootstrap.
FROM oven/bun:1.2.23
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=bun:bun package.json ./
RUN bun install --production
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun company-os ./company-os
COPY --chown=bun:bun strategy/PRODUCT-IDENTITY-SSOT-v3.json ./strategy/PRODUCT-IDENTITY-SSOT-v3.json
COPY --chown=bun:bun strategy/ICP_KPI_OPERATING_CONTRACT_v1.json ./strategy/ICP_KPI_OPERATING_CONTRACT_v1.json
COPY --chown=bun:bun public ./public
USER bun
EXPOSE 8080
CMD ["bun", "run", "src/server.ts"]
