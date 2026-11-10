# Dedicated GitHub-backed SignalForge application, replacing the limited Railway Function bootstrap.
FROM oven/bun:1.2.23
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=bun:bun package.json ./
RUN bun install --production
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun public ./public
USER bun
EXPOSE 8080
CMD ["bun", "run", "src/server.ts"]
