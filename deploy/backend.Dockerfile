# Multi-workspace build for the trials backend.
#
# Installs all workspace deps at the monorepo root, symlinks the nested
# ledger-v8 to work around a wasm class-identity issue in
# @midnight-ntwrk/midnight-js-protocol@4.1.1, then runs the backend directly
# via tsx (matches the local dev flow).

FROM node:22-bookworm-slim

WORKDIR /monorepo

# better-sqlite3 native build needs Python + build essentials on Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ curl \
    && rm -rf /var/lib/apt/lists/*

# Yarn 4 via corepack
RUN corepack enable

# Copy workspace roots first — better layer cache when only source changes
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/contract/package.json packages/contract/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

RUN yarn install

# Dedup nested ledger-v8 so the wasm class identity is consistent — same
# workaround required against midnight-js-protocol@4.1.1 locally.
RUN rm -rf node_modules/@midnight-ntwrk/midnight-js-protocol/node_modules/@midnight-ntwrk/ledger-v8 \
    && ln -s ../../../../@midnight-ntwrk/ledger-v8 \
        node_modules/@midnight-ntwrk/midnight-js-protocol/node_modules/@midnight-ntwrk/ledger-v8

# Source. Frontend is served statically by Caddy — not needed inside this image.
COPY packages/contract/src packages/contract/src
COPY packages/contract/scripts packages/contract/scripts
COPY packages/backend/src packages/backend/src
COPY packages/backend/tsconfig.json packages/backend/tsconfig.json

# SQLite storage dir — mounted as a volume for persistence across rebuilds
RUN mkdir -p packages/backend/data

EXPOSE 3000

CMD ["yarn", "workspace", "@weownhealth/trials-backend", "exec", "tsx", "src/index.ts"]
