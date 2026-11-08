# API del almacén · imagen multietapa (plan 02 fase 4)
#   etapa build: instala todo, compila TypeScript (tsconfig.build.json) y quita las dependencias de desarrollo
#   etapa final: solo build/, node_modules de producción y package.json; corre como el usuario node (uid 1000)
# Secretos (JWTSECRET, DB_PASSWORD, SMTP_*) se inyectan con --env-file en docker run.
# Migraciones: node build/migrar.js show|run|revert (docs/api/procedimiento-migracion-produccion.md).

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production \
    SALT_ROUNDS=10 \
    API_ALMACEN=/api \
    RUTA_ARCHIVOS=/code/exogrid/archivos/ \
    RUTA_REPORTES=/code/exogrid/reportes/ \
    UPLOADS=/code/exogrid/uploads/ \
    ARCHIVOS_AUXILIARES=/code/exogrid/auxiliares/ \
    IMAGENES_IMPORTACION=/code/exogrid/imgproductos/ \
    DIAS_CUARENTENA=120 \
    LOG_CONSOLE_VERBOSE=error \
    LOG_NIVEL=info \
    PORT_ALMACEN_API=4200 \
    DB_HOST=mariadb \
    DB_USER=almacen_usr \
    DB_PORT=3306 \
    DB_DATABASE_NAME=almacen_sony_migracion \
    DB_SYNCRO=false \
    DB_LOGGING=error

WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
RUN mkdir -p /code/exogrid/archivos /code/exogrid/reportes /code/exogrid/uploads /code/exogrid/auxiliares /code/exogrid/imgproductos \
    && chown -R node:node /code/exogrid

USER node
VOLUME ["/code/exogrid"]
EXPOSE 4200
CMD ["node", "build/index.js"]
