# The production game: one container, one port. `pnpm build` turns the source into static files (dist/); `pnpm start`
# runs the game server, which serves them and the game's WebSocket on $PORT (Render sets it).
FROM node:24-slim
WORKDIR /app
# Newer Node no longer ships corepack, so install it; it then runs the pnpm version package.json pins.
RUN npm install -g corepack@latest && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Render passes its environment variables to the build as build args: this one puts the commit into the page.
ARG RENDER_GIT_COMMIT
RUN pnpm build
ENV NODE_ENV=production
EXPOSE 8080
CMD ["pnpm", "start"]
