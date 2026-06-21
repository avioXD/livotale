FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5174

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5174"]
