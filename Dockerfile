# syntax=docker/dockerfile:1

FROM node:22.22.0-bookworm-slim

ARG RUST_VERSION=1.94.0
ARG WASM_BINDGEN_VERSION=0.2.127
ARG PNPM_VERSION=11.22.0

ENV DEBIAN_FRONTEND=noninteractive
ENV RUSTUP_HOME=/home/node/.rustup
ENV CARGO_HOME=/home/node/.cargo
ENV PATH=/home/node/.cargo/bin:${PATH}
ENV CHROME=/usr/bin/chromium

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        ca-certificates \
        chromium \
        chromium-sandbox \
        curl \
        git \
        pkg-config \
        python3 \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global "pnpm@${PNPM_VERSION}" \
    && test -u /usr/lib/chromium/chrome-sandbox

USER node

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
      | sh -s -- -y --profile minimal --default-toolchain "${RUST_VERSION}" \
        --component clippy,rustfmt \
    && rustup target add wasm32-unknown-unknown \
    && cargo install wasm-bindgen-cli \
        --version "${WASM_BINDGEN_VERSION}" \
        --locked

COPY --chown=root:root --chmod=755 docker/chromium /usr/local/bin/chromium-docker

WORKDIR /workspace

RUN mkdir -p target

COPY --chown=node:node . .

RUN pnpm install --frozen-lockfile \
    && cargo fetch --locked

ENV CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_RUSTFLAGS="-C target-feature=+fp16"

EXPOSE 5173

CMD ["sh", "-c", "pnpm install --frozen-lockfile && pnpm --dir apps/web build && exec python3 -m http.server 5173 --bind 0.0.0.0 --directory apps/web/dist"]
