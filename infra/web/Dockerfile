# chronos-web: Caddy (con plugins DNS para el certificado) + Caddyfile + build del front, en una sola imagen.
# Contexto de build: la raíz del repo (necesita front/). Ejemplo:
#   docker build -f infra/web/Dockerfile --build-arg VERSION=4.8.0 -t chronos-web:4.8.0-s .
# Spec: docs/superpowers/specs/2026-11-10-caddy-docker-amz-design.md

# ---------- 1. Build del front (Vite) ----------
FROM node:24-alpine AS front
WORKDIR /app
COPY front/package.json front/package-lock.json ./
RUN npm ci
COPY front/ ./

# X.Y.Z sin sufijo -d/-s. Se escribe en package.json porque el release de Sentry y la pantalla de acceso leen esa
# versión (`chronos-wms-front@<version>`). Sin VERSION se conserva la del repo.
ARG VERSION=""
# DSN de Sentry del front (opcional; vacío = Sentry apagado). Es público por naturaleza (va dentro del bundle).
ARG VITE_SENTRY_DSN=""
ENV VITE_API_URL=/api/ \
    VITE_NOTIFICACIONES=on \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
RUN if [ -n "$VERSION" ]; then npm pkg set version="$VERSION"; fi \
    && npm run build

# ---------- 2. Caddy con los módulos DNS (cloudflare y linode) ----------
FROM caddy:2.10-builder AS caddy
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare \
    --with github.com/caddy-dns/linode

# ---------- 3. Imagen final ----------
FROM caddy:2.10-alpine
COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY infra/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=front /app/build /srv

# Valores por defecto; en ejecución los fija el compose del cliente (ver infra/web/README.md).
ENV DOMINIOS=":80" \
    DNS_PROVEEDOR="cloudflare" \
    API_UPSTREAM="api:4200" \
    CLIENTE="" \
    ENTORNO="" \
    ACME_CA="https://acme-v02.api.letsencrypt.org/directory"

EXPOSE 80 443
