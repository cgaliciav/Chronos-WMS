# Caddy en Docker y cliente AMZ · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desplegar AMZ con una imagen web única (Caddy + front + TLS por reto DNS) y una imagen de API publicadas
en Docker Hub. AMZ arranca con una carga inicial (catálogos de Sony y un administrador), y staging puede alternar
entre la topología actual de Sony (nginx) y la nueva (Caddy).

**Architecture:** Dos imágenes, `chronos-web` (Caddy con plugins DNS de Cloudflare y Linode, Caddyfile parametrizado
por variables y el build de React) y `chronos-api`. Se construyen una vez en la máquina del propietario, se etiquetan
`X.Y.Z-s` y se promueven a `X.Y.Z` sin reconstruir. Un solo compose, parametrizado por un `.env` por cliente, levanta
`web`, `api` y `mariadb` (más `mailpit` en staging con un archivo de compose adicional). Scripts de bash despliegan por
SSH en la VM de staging o en el Linode de AMZ.

**Tech Stack:** Caddy 2 (xcaddy, `caddy-dns/cloudflare`, `caddy-dns/linode`), Docker + buildx + compose v2, Node 24,
TypeScript, TypeORM 1.1, MariaDB 10.11 (10.3 para Sony), Vite + `vite-plugin-pwa`, Sentry, Jest, Vitest, bash.

**Spec:** `docs/superpowers/specs/2026-11-10-caddy-docker-amz-design.md`. Léelo antes de empezar; este plan
argumenta desde él.

## Global Constraints

- Código, comentarios, commits y documentación en **español**. Las rutas HTTP siguen en inglés.
- Versionado `vX.Y.Z` (CLAUDE.md raíz): en el repo, `X.Y.Z-d`. **Dentro** de cada imagen va `X.Y.Z`; la etiqueta de
  staging es `X.Y.Z-s` y la de producción `X.Y.Z`, ambas sobre el mismo digest. Cambia versiones con
  `npm version X.Y.Z-d --no-git-tag-version` y anótalas en el CHANGELOG de la app.
- Ninguna imagen lleva secretos: todo secreto entra por `.env` en el servidor, y los `.env` nunca se versionan (sí los
  `.env.example`).
- Nunca tocar `linode-prod` (producción de Sony): solo se lee.
- En staging, todo el correo va a mailpit en **todos** los modos (`SMTP_ANULAR=mailpit:2525`, alias de red
  `smtp.postmarkapp.com`, unit `staging-block-smtp` intacto).
- No modificar `front/nginx.conf`, `infra/staging/nginx-staging.conf`, `infra/staging/update-staging.sh` ni
  `front/deploy-production.sh`, salvo documentación: el modo `sony-nginx` debe seguir idéntico.
- Plataforma de las imágenes: `linux/amd64`.
- Correo de AMZ: `SMTP_FROM=chronos-amz@exogrid.xyz`, `SOPORTE_CORREO=soporte@exogrid.io`, la misma cuenta de Postmark
  que Sony.
- Retos DNS: Cloudflare para AMZ (staging y producción); Linode para Sony (`staging.telesetalmacen.com` y producción).
- MariaDB `10.11` para AMZ; `10.3` para cualquier stack que use los datos de Sony.
- Corrección del spec: la migración `Configuracion` **sí** inserta datos (`INSERT IGNORE` de la configuración por
  defecto y del rol `CONFIGURACION-EDITAR` con id automático). La carga inicial debe convivir con eso (Task 1).

## Review Focus

1. **Carga inicial contra una base que ya opera** (por ejemplo, alguien la corre con el `.env` de Sony): debe negarse
   sin escribir nada si hay movimientos. Prueba en la Task 1.
2. **Etiqueta ya publicada:** volver a construir `X.Y.Z-s`, o promover a un `X.Y.Z` que ya existe, sobrescribiría lo
   probado o lo que corre en producción. Los scripts se niegan. Prueba en la Task 5.
3. **Caddy sin API, o API lenta:** la app debe seguir cargando el front, con 502 solo en `/api`, y una subida grande
   no debe cortarse antes de 60 s. Prueba en la Task 4.
4. **Cambiar a `sony-nginx` con un stack Caddy encendido** (o al revés): sin cerrar antes el otro, los puertos 80/443
   chocan y el modo queda a medias. El script cierra primero y verifica que los puertos queden libres. Prueba en la
   Task 7.
5. **Migración desde `caddy-sony` sobre los datos compartidos de Sony:** cambiaría el esquema que usa `sony-nginx`.
   El despliegue se niega a migrar Sony sin `--permitir-migrar`, y antes toma un snapshot. Prueba en las Tasks 6 y 7.

---

### Task 1: Carga inicial de una base nueva (API)

**Files:**
- Create: `api/src/semilla/catalogo.json`: catálogo de Sony, versionado.
- Create: `api/src/semilla/extraerCatalogo.ts`: genera `catalogo.json` leyendo una base de Sony (staging).
- Create: `api/src/semilla/sembrarInicial.ts`: lógica.
- Create: `api/src/sembrar.ts`: CLI (compila a `build/sembrar.js`).
- Test: `api/src/test/sembrarInicial.int.test.ts`
- Modify: `api/package.json` (scripts `semilla:extraer`, `semilla:run`), `api/README.md` (sección "Base nueva").

**Interfaces:**
- Produce:
  ```ts
  // api/src/semilla/sembrarInicial.ts
  export interface Catalogo {
    movimientoTipo: { id: number; nombre: string; estatus: string }[];
    rol: { nombre: string; codigoRol: string; estatus: string }[];   // sin id: se identifica por codigoRol
    precioTipo: { id: number; nombre: string; estatus?: string }[];
    facturaTipo: { id: number; nombre: string; estatus?: string }[];
    productoTipo: { id: number; nombre: string; estatus?: string }[];
    parametros: { llave: string; valor: string }[];                   // se identifica por llave
  }
  export interface OpcionesSembrado { adminCorreo: string; adminNombre: string; regenerar?: boolean }
  export interface ResultadoSembrado { adminCreado: boolean; passwordTemporal: string | null; insertados: Record<keyof Catalogo, number> }
  export class BaseEnUsoError extends Error {}
  export async function sembrarInicial(conexion: DataSource, catalogo: Catalogo, opciones: OpcionesSembrado): Promise<ResultadoSembrado>
  ```
- CLI: `node build/sembrar.js --admin-correo <correo> --admin-nombre "<nombre>" [--regenerar]`. Imprime la
  contraseña temporal en consola, la envía con `EnviarMail.correoNuevoUsuario` (un fallo de correo solo avisa) y sale
  con código 0, 3 si `BaseEnUsoError`, o 1 en otro error. Lo usa la Task 6.

- [ ] **Step 1: Inventario de catálogos.** Busca en `api/src` los ids o nombres fijos de `precio_tipo`, `factura_tipo`,
  `producto_tipo` y las llaves de `parametros` (guía: `api/src/test/seed.ts` lista lo que el API necesita para
  funcionar). Si aparece otra tabla de catálogo imprescindible, añádela a `Catalogo` con el mismo criterio (id fijo si
  el código compara ids; clave natural si no). Áreas, bodegas, proyectos, proveedores y comentarios **no** van: los
  captura AMZ.
- [ ] **Step 2: Escribe `extraerCatalogo.ts`.** Lee con las variables `DB_*` del entorno, escribe `catalogo.json`
  ordenado por id o clave, y excluye filas con estatus `eliminado`. Script: `"semilla:extraer": "ts-node src/semilla/extraerCatalogo.ts"`.
- [ ] **Step 3: Genera `catalogo.json` desde staging** (modo `sony-nginx` encendido; MariaDB en `127.0.0.1:3308` de la VM):
  ```bash
  ssh -fN -L 3308:127.0.0.1:3308 cesargv@$(cat ~/staging-cache/vm-ip)
  DB_HOST=127.0.0.1 DB_PORT=3308 DB_USER=almacen_usr DB_PASSWORD=<.env de la VM> DB_DATABASE_NAME=almacen_sony_migracion npm run semilla:extraer
  ```
  Esperado: `catalogo.json` contiene los 17 `movimientoTipo` con los ids y nombres de `TIPOS_MOVIMIENTO` (`seed.ts`) y
  un rol `ADMINISTRADOR`. Revisa el diff a mano: no debe haber datos personales.
- [ ] **Step 4: Escribe la prueba que falla** (`sembrarInicial.int.test.ts`). Usa una base propia
  `${DB_DATABASE_NAME}_semilla`: créala con `CREATE DATABASE IF NOT EXISTS` y luego
  `fuentePruebas({ database, dropSchema: true, subscribers: [] })` + `runMigrations()`. Casos:
  - `"base vacía: siembra catálogos y crea el administrador con contraseña temporal"`: `movimiento_tipo` tiene los ids
    1…17 con los nombres del JSON; existe un `rol` por cada `codigoRol` del JSON y `CONFIGURACION-EDITAR` no se duplica;
    el usuario tiene el rol `ADMINISTRADOR`, `debeCambiarPassword = true` y `vencePasswordTemporal` ≈ ahora + 72 h;
    `passwordTemporal` no es nula y `POST /auth/login` con ella responde 200 (con la app contra esa base, o con
    `bcrypt.compare` si levantar la app ahí es costoso).
  - `"idempotente: la segunda vez no inserta nada ni cambia la contraseña"`: `insertados` todo en 0, `adminCreado = false`,
    `passwordTemporal = null` y el hash sin cambios.
  - `"--regenerar da una contraseña temporal nueva al administrador existente"`.
  - `"se niega si la base ya tiene movimientos"`: inserta una fila mínima en `movimiento` y espera `BaseEnUsoError`, y que
    los conteos de las tablas de catálogo y de `usuario` no cambien.
- [ ] **Step 5: Verifica que falla.** Run: `npm run test:int:up && npx jest --selectProjects integration src/test/sembrarInicial.int.test.ts`.
  Expected: FAIL (`sembrarInicial` no existe). Si no, revisa cómo arranca `test:int`: `resetDb` corre antes de Jest y
  solo toca la base principal.
- [ ] **Step 6: Implementa `sembrarInicial`** en una transacción:
  - Primero el chequeo `SELECT 1 FROM movimiento LIMIT 1` → `BaseEnUsoError`.
  - `movimiento_tipo`, `precio_tipo`, `factura_tipo` y `producto_tipo` con `INSERT IGNORE` por id.
  - `rol` y `parametros` con `INSERT IGNORE` por su clave única (`codigoRol`, `llave`).
  - Administrador: si no existe ese correo, se crea con `vencimiento` dentro de 10 años, `roles: [ADMINISTRADOR]` y
    `asignarPasswordTemporal()` (`services/PasswordService.ts`). Si existe y llega `regenerar`, solo se reasigna la
    temporal.
  - El suscriptor de auditoría se omite (fuente sin `subscribers`, como `resetDb.ts`).
- [ ] **Step 7: Implementa la CLI** `api/src/sembrar.ts`. Sigue el patrón de `migrar.ts`: `import "./entorno"`
  primero, y `opcionesDataSource({ synchronize: false, subscribers: [] })`. Carga `semilla/catalogo.json` (asegúrate de
  que `tsconfig.build.json` lo copie o lo importe; comprueba que `build/semilla/catalogo.json` exista tras `npm run build`).
  Script: `"semilla:run": "ts-node src/sembrar.ts"`.
- [ ] **Step 8: Verifica.** Run: `npx jest --selectProjects integration src/test/sembrarInicial.int.test.ts` → PASS.
  Después `npm run typecheck && npm test` → todo PASS (incluye la prueba que exige migración si cambian entidades: aquí
  no cambia ninguna).
- [ ] **Step 9: Commit**
  ```bash
  git add api/src/semilla api/src/sembrar.ts api/src/test/sembrarInicial.int.test.ts api/package.json api/README.md
  git commit -m "api: carga inicial de una base nueva (catálogos de Sony y administrador con contraseña temporal)"
  ```

### Task 2: Sentry de la API con entorno y cliente

**Files:**
- Modify: `api/src/sentry.ts`, `api/.env.example`, `api/CHANGELOG.md`, `api/package.json` (versión)
- Test: `api/src/sentry.test.ts` (unitaria)

**Interfaces:**
- Produce: `export const opcionesSentry = (env: NodeJS.ProcessEnv, version: string): Sentry.NodeOptions | null`.
  `iniciarSentry()` la usa.
- Variables nuevas: `SENTRY_ENVIRONMENT` (`staging` | `produccion`) y `CLIENTE` (`amz` | `sony`). Las usan las
  Tasks 6 y 7.

- [ ] **Step 1: Prueba que falla** `sentry.test.ts`:
  - sin `SENTRY_DSN` → `null`;
  - con DSN y `SENTRY_ENVIRONMENT=staging`, `CLIENTE=amz` → `environment === "staging"`,
    `initialScope.tags.cliente === "amz"`, `release === "almacen-api@2.89.0"` (con `version = "2.89.0"`);
  - sin `SENTRY_ENVIRONMENT` → cae a `NODE_ENV`;
  - sin `CLIENTE` → sin etiqueta `cliente`.
- [ ] **Step 2:** Run: `npx jest --selectProjects unit src/sentry.test.ts` → FAIL.
- [ ] **Step 3:** Implementa `opcionesSentry` y haz que `iniciarSentry` la use. Documenta las dos variables en
  `.env.example`.
- [ ] **Step 4:** Run: `npx jest --selectProjects unit src/sentry.test.ts && npm run typecheck` → PASS.
- [ ] **Step 5: Versión.** Las Tasks 1 y 2 son capacidades nuevas: `npm version 2.89.0-d --no-git-tag-version` y
  entrada en `api/CHANGELOG.md` (carga inicial, Sentry con entorno y cliente).
- [ ] **Step 6: Commit** `api: Sentry con SENTRY_ENVIRONMENT y etiqueta cliente, v2.89.0-d`.

### Task 3: Sentry del front con entorno y cliente en tiempo de ejecución

**Files:**
- Create: `front/src/entorno.ts`
- Modify: `front/src/sentry.ts`, `front/src/index.tsx`, `front/CHANGELOG.md`, `front/package.json` (versión)
- Test: `front/src/entorno.test.ts`, `front/src/sentry.test.ts`

**Interfaces:**
- Consume: `GET /entorno.json` → `{"cliente":"amz","entorno":"staging"}`, servido por Caddy (Task 4) con `no-cache`.
- Produce:
  ```ts
  export interface Entorno { cliente?: string; entorno?: string }
  export async function cargarEntorno(fetcher?: typeof fetch): Promise<Entorno>   // nunca lanza; {} ante error, 404 o JSON inválido; timeout 2 s
  export function opcionesSentry(dsn: string | undefined, entorno: Entorno, modo: string, version: string): Sentry.BrowserOptions | null
  export function iniciarSentry(entorno: Entorno): boolean
  ```

- [ ] **Step 1: Pruebas que fallan.**
  - `cargarEntorno` con fetch simulado: devuelve el JSON; ante 404, error de red, JSON inválido o más de 2 s devuelve
    `{}`; pide con `cache: 'no-store'`.
  - `opcionesSentry`: sin DSN → `null`; con DSN → `environment = entorno.entorno ?? modo`,
    `initialScope.tags.cliente = entorno.cliente` (ausente si no hay), `release = 'chronos-wms-front@4.9.0'` con
    `version = '4.9.0'`.
- [ ] **Step 2:** Run: `npx vitest run src/entorno.test.ts src/sentry.test.ts` → FAIL.
- [ ] **Step 3:** Implementa. En `index.tsx`, la app se renderiza sin esperar a Sentry:
  `cargarEntorno().then(iniciarSentry)`. Solo se pierde Sentry en los primeros milisegundos.
- [ ] **Step 4:** Run: `npm run lint && npm run typecheck && npm test -- --run && npm run build` → todo PASS.
- [ ] **Step 5: Versión.** `npm version 4.9.0-d --no-git-tag-version` y entrada en `front/CHANGELOG.md`.
- [ ] **Step 6: Commit** `front: Sentry con entorno y cliente leídos de /entorno.json, v4.9.0-d`.

### Task 4: Imagen `chronos-web` (Caddy + front + TLS por DNS)

**Files:**
- Create: `infra/web/Dockerfile`, `infra/web/Caddyfile`, `infra/web/README.md`
- Create: `infra/web/probar-web.sh` (prueba de humo de la imagen, sin TLS)

**Interfaces:**
- Build args: `VERSION` (X.Y.Z, se escribe en el `package.json` del front antes del build) y `VITE_SENTRY_DSN`
  (opcional). Fija `VITE_API_URL=/api/` y `VITE_NOTIFICACIONES=on`.
- Variables de ejecución (las consume la Task 6):

  | Variable | Ejemplo | Uso |
  |---|---|---|
  | `DOMINIOS` | `amz.ejemplo.mx, otro.ejemplo.mx` | Direcciones del sitio (varias durante un cambio de dominio). `:80` = modo prueba sin TLS |
  | `DNS_PROVEEDOR` | `cloudflare` / `linode` | Módulo `acme_dns` |
  | `DNS_TOKEN` | — | Token del proveedor DNS |
  | `ACME_EMAIL` | — | Cuenta ACME |
  | `ACME_CA` | por defecto Let's Encrypt producción | CA de pruebas al iterar |
  | `API_UPSTREAM` | `api:4200` | Destino de `/api` |
  | `CLIENTE`, `ENTORNO` | `amz`, `staging` | `/entorno.json` y cabecera `X-Environment` |

- Etapas: `node:24-alpine` (build del front con `npm ci`), `caddy:2.10-builder` (`xcaddy build --with
  github.com/caddy-dns/cloudflare --with github.com/caddy-dns/linode`) y `caddy:2.10-alpine` final, con el binario,
  `/etc/caddy/Caddyfile` y el build en `/srv`. Contexto de build: la raíz del repo (necesita `front/`).

- [ ] **Step 1: Escribe la prueba de humo `probar-web.sh` (debe fallar sin imagen).** Construye la imagen
  `chronos-web:prueba` y crea una red. Levanta un "API" falso que responda eco de la ruta, las cabeceras recibidas y
  `/lento` tras 50 s (p. ej. `mendhak/http-https-echo` con su opción de retraso, o un `node -e` mínimo). Levanta la
  imagen con `DOMINIOS=:80`, `DNS_TOKEN=x`, `CLIENTE=amz`, `ENTORNO=staging` y comprueba con `curl` (cada fallo imprime
  qué esperaba y sale 1):
  1. `GET /api/groups?x=1` → el eco recibió la ruta `/groups?x=1` (prefijo quitado) y `X-Forwarded-For` presente.
  2. `GET /` y `GET /catalogo/general` → 200, HTML, `Cache-Control: no-cache`.
  3. `GET /index.html`, `/sw.js` y `/manifest.webmanifest` → `Cache-Control: no-cache`; el manifest con
     `Content-Type: application/manifest+json`.
  4. `GET /assets/<un archivo real del build>` y `GET /workbox-<hash>.js` → `Cache-Control: public, max-age=31536000, immutable`.
  5. `GET /assets/no-existe.js`, `/sw-inexistente.js`, `/workbox-no.js` y `/assets/<real>.js.map` → 404 y **no** HTML.
  6. `GET /entorno.json` → `{"cliente":"amz","entorno":"staging"}`, `no-cache`; las respuestas llevan `X-Environment: staging`.
  7. `POST /api/upload` con 100 MB → llega completo al eco. `GET /api/lento` → responde (50 s < 60 s de timeout).
  8. Con el API falso detenido: `GET /` → 200 y `GET /api/x` → 502.
  9. `caddy validate` dentro del contenedor, con `DOMINIOS=ejemplo.com` y `DNS_PROVEEDOR` en `cloudflare` y en `linode`
     → válido. Prueba que ambos plugins están compilados y que el Caddyfile parsea con TLS.
  Run: `bash infra/web/probar-web.sh` → FAIL (no hay Dockerfile).
- [ ] **Step 2: Escribe `Dockerfile` y `Caddyfile`** con las reglas del spec §6:
  - `acme_dns {$DNS_PROVEEDOR} {$DNS_TOKEN}`, `email` y `acme_ca` en las opciones globales.
  - `handle_path /api/*` con `reverse_proxy {$API_UPSTREAM}`: timeouts de transporte de 60 s, `request_body max_size 100MB`,
    sin buffer de petición. No repite CORS y no acepta `X-Forwarded-*` entrantes (Caddy por defecto, sin `trusted_proxies`).
  - Archivos de nombre exacto (`/sw.js`, `/workbox-*.js`, `/manifest.webmanifest`, `/assets/*`) con `file_server` sin
    fallback.
  - `*.map` → 404.
  - El resto con `try_files {path} /index.html`.
  - `encode zstd gzip`.
  - Sin ninguna redirección sobre `sw.js`.
  Revisa en la documentación de `caddy-dns/linode` el formato exacto de su argumento en `acme_dns`.
- [ ] **Step 3:** Run: `bash infra/web/probar-web.sh` → todas las comprobaciones OK.
- [ ] **Step 4: README** con las variables, cómo correr la prueba y la nota de cambio de dominio con PWA (spec §8:
  durante la transición, ambos dominios en `DOMINIOS`).
- [ ] **Step 5: Commit** `infra: imagen chronos-web (Caddy con plugins DNS, Caddyfile y front) y su prueba de humo`.

### Task 5: Construir, publicar y promover imágenes

**Files:**
- Create: `infra/imagenes/construir.sh`, `infra/imagenes/promover.sh`, `infra/imagenes/lib.sh`,
  `infra/imagenes/imagenes.conf.example`, `infra/imagenes/README.md`
- Modify: `.gitignore` (`infra/imagenes/imagenes.conf`)

**Interfaces:**
- `imagenes.conf`: `DOCKERHUB_NS=<usuario u organización>` (obligatorio) y `SENTRY_DSN_FRONT=` (opcional).
- `construir.sh web|api [--ref <git-ref>]`: exporta la ref (por defecto `HEAD`, y exige un árbol limpio) a un
  directorio temporal con `git archive`. Calcula `X.Y.Z` del `package.json` de la app (quita `-d`), construye con
  `docker buildx build --platform linux/amd64` y publica `${DOCKERHUB_NS}/chronos-<app>:X.Y.Z-s`, con las etiquetas
  OCI `org.opencontainers.image.version=X.Y.Z` y `org.opencontainers.image.revision=<sha>`. En `api` reescribe la
  versión del `package.json` exportado a `X.Y.Z`. Imprime la etiqueta y el digest.
- `promover.sh web|api X.Y.Z`: `docker buildx imagetools create -t ns/chronos-<app>:X.Y.Z ns/chronos-<app>:X.Y.Z-s`,
  e imprime el digest (debe coincidir con el de `-s`).

- [ ] **Step 1: Escribe las verificaciones.** `construir.sh --comprobar` corre las comprobaciones sin publicar. Si la
  etiqueta `X.Y.Z-s` ya existe en Docker Hub (`docker buildx imagetools inspect`), sale con 1 y el mensaje "ya
  publicada; sube la versión". Lo mismo en `promover.sh` si `X.Y.Z` ya existe, o si `X.Y.Z-s` no existe.
- [ ] **Step 2: Implementa** ambos scripts con `set -Eeuo pipefail` y el estilo de `infra/staging/lib.sh` (`step`,
  `ok`, `die`).
- [ ] **Step 3: Verifica en la máquina del propietario** (ya hay sesión en Docker Hub):
  - `infra/imagenes/construir.sh api` → publica `chronos-api:2.89.0-s`.
  - `docker run --rm <img> node -p "require('./package.json').version"` → `2.89.0`.
  - `docker history --no-trunc <img> | grep -iE 'JWTSECRET=|PASSWORD=|TOKEN='` → sin resultados.
  - Repetir `construir.sh api` → sale 1 con "ya publicada".
  - Lo mismo con `web`: `chronos-web:4.9.0-s`.
  - **No promuevas todavía:** `promover.sh` se prueba en la Task 8, con `promover.sh web 0.0.0` (sin `-s` publicada) →
    sale 1.
- [ ] **Step 4: Commit** `infra: scripts para construir, publicar y promover chronos-web y chronos-api`.

### Task 6: Compose por cliente y despliegue genérico

**Files:**
- Create: `infra/clientes/compose.yml`: `web`, `api` y `mariadb`.
- Create: `infra/clientes/compose.staging.yml`: `mailpit` con alias `smtp.postmarkapp.com`; en `api`, `SMTP_ANULAR`, `SMTP_*` de mailpit y `SENTRY_ENVIRONMENT=staging`.
- Create: `infra/clientes/amz/.env.example`, `infra/clientes/sony/.env.caddy.example`
- Create: `infra/clientes/desplegar.sh`
- Modify: `infra/clientes/sony/README.md` (sección Caddy)

**Interfaces:**
- `.env` por cliente. Claves:
  - Proyecto: `COMPOSE_PROJECT_NAME` (`chronos-amz` / `chronos-sony`), `CLIENTE`, `ENTORNO`.
  - Imágenes: `IMAGEN_WEB`, `IMAGEN_API` (`ns/chronos-web:4.9.0-s`), `MARIADB_IMAGEN` (`mariadb:10.11`; Sony `mariadb:10.3`).
  - Datos: `DATOS_DIR` (donde viven `db_data/` y `exogrid/`; Sony en staging: `/home/cesargv/teleset-almacen`).
  - Base: `DB_DATABASE_NAME` (AMZ: `chronos_amz`), `DB_PASSWORD`, `DB_ROOT_PASSWORD`.
  - API: `JWTSECRET`, `CONFIG_CLAVE`, `TRUST_PROXY=uniquelocal`, `SMTP_*`, `SMTP_FROM`, `SOPORTE_CORREO`,
    `SENTRY_DSN`, `SENTRY_ENVIRONMENT`.
  - Web: `DOMINIOS`, `DNS_PROVEEDOR`, `DNS_TOKEN`, `ACME_EMAIL`, `ACME_CA`.
  - Sony además: `ARCHIVOS_PUBLICOS`, `DB_USER=almacen_usr` y el nombre de base `almacen_sony_migracion`.
- Solo `web` publica `80:80`, `443:443` y `443:443/udp`. `mariadb` en `127.0.0.1:${DB_PUERTO_LOCAL:-3309}:3306`. Los
  volúmenes `caddy_data` y `caddy_config` son con nombre, uno por proyecto. Todos los servicios llevan
  `restart: unless-stopped`, healthcheck (en mariadb, como hoy) y `logging: { driver: json-file, options: { max-size: 10m, max-file: "5" } }`.
  La API depende de mariadb `service_healthy`.
- `desplegar.sh --host <ssh> --dir <ruta remota> --cliente amz|sony --version-web V --version-api V [--staging] [--sembrar-admin <correo> --admin-nombre <n>] [--permitir-migrar] [--antes-de-migrar <comando local>]`.
  Pasos:
  1. `rsync` de `compose.yml` (+ `compose.staging.yml` con `--staging`) al directorio remoto.
  2. Actualiza `IMAGEN_WEB` e `IMAGEN_API` en el `.env` remoto y hace `docker compose pull`.
  3. `docker compose up -d mariadb`; luego `docker compose run --rm api node build/migrar.js show`. Si hay pendientes:
     con `--cliente sony` sin `--permitir-migrar` se detiene. Si no, ejecuta `--antes-de-migrar` (el wrapper de staging
     pasa ahí el snapshot) y después `migrar.js run`.
  4. Con `--sembrar-admin`, corre `node build/sembrar.js` y muestra su salida (la contraseña). Un código 3 detiene el
     despliegue con "la base ya está en uso".
  5. `docker compose up -d` y, como prueba de humo, `curl -sf https://<primer dominio>/` y `/api/` (en staging,
     resolviendo el dominio a la IP con `--resolve`).
  Escribe una línea en `<dir>/despliegues.log` (fecha, versiones, resultado).

- [ ] **Step 1: Verificación que falla.** Run:
  `docker compose -f infra/clientes/compose.yml -f infra/clientes/compose.staging.yml --env-file infra/clientes/amz/.env.example config -q`
  → FAIL (no existen).
- [ ] **Step 2: Escribe los compose y los `.env.example`.** Los valores secretos van vacíos y comentados; el `.env`
  real se genera en la Task 7 o en el procedimiento de la Task 8.
- [ ] **Step 3:** Run el `config -q` anterior, con y sin el archivo de staging, para AMZ y para Sony → sin errores.
  Comprueba en la salida de `config` que solo `web` publica puertos y que `mariadb` escucha en `127.0.0.1`.
- [ ] **Step 4: Escribe `desplegar.sh`.** Nunca imprime el `.env`. `shellcheck infra/clientes/desplegar.sh` → limpio.
- [ ] **Step 5: Commit** `infra: compose por cliente con Caddy y script de despliegue genérico`.

### Task 7: Staging con modos alternables

**Files:**
- Create: `infra/staging/staging-modo.sh`, `infra/staging/desplegar-caddy.sh`
- Modify: `infra/staging/cloud-init/user-data.tpl` (añade el paquete `docker-compose-v2`),
  `infra/staging/README.md` (sección "Modos"), `infra/staging/lib.sh` (constantes de rutas de los stacks Caddy)

**Interfaces:**
- Rutas en la VM: AMZ en `/home/cesargv/chronos-amz` (`.env`, `db_data/`, `exogrid/`). Sony con Caddy en
  `/home/cesargv/chronos-sony` (solo `.env` y compose; sus datos con `DATOS_DIR=/home/cesargv/teleset-almacen`).
- `staging-modo.sh sony-nginx | caddy-amz | caddy-sony | --estado | --preparar`:
  - `--preparar` es idempotente. Instala `docker-compose-v2` en la VM si falta. Crea las carpetas, genera el `.env` de
    cada stack a partir del `.env.example` con secretos aleatorios (`openssl rand`), sin sobrescribir uno existente.
    Pide por consola `DNS_TOKEN` de Cloudflare (AMZ) y de Linode (Sony), `DOCKERHUB_NS` y el token de Docker Hub de
    solo lectura para `docker login`.
  - Cambiar de modo:
    1. Apaga lo que no corresponde: `docker compose -p chronos-* stop`, o `docker-compose stop` del stack de Sony
       (v1) + `systemctl stop nginx`.
    2. Verifica con `ss -ltn` que 80/443 estén libres.
    3. Enciende el destino. En `sony-nginx`: `docker-compose up -d` + `systemctl start nginx`. En Caddy:
       `docker compose up -d`.
    4. Guarda el modo en `/home/cesargv/staging-modo`.
    La primera vez que entra a `caddy-sony` toma, desde el host, el snapshot `pre-caddy-sony-<AAAAMMDD-HHMM>` (con la
    función que ya usa `update-staging.sh`).
  - `--estado`: modo activo, contenedores, versiones de imagen y vencimiento del certificado
    (`openssl s_client` contra el dominio).
- `desplegar-caddy.sh amz|sony --version-web V --version-api V [--sembrar-admin <correo> --admin-nombre <n>] [--permitir-migrar]`:
  llama a `desplegar.sh` con `--host` de la VM, `--staging` y `--antes-de-migrar "virsh … snapshot-create-as … pre-update-…"`.
  Exige que el modo activo sea el del cliente.

- [ ] **Step 1: [propietario] DNS y tokens.**
  - Registro A (nube gris) del subdominio de staging de AMZ en Cloudflare → IP de la VM.
  - `staging.telesetalmacen.com` en la zona de Linode → IP de la VM.
  - Token de Cloudflare con `Zone:DNS:Edit` sobre esa zona, y token de Linode con `Domains: Read/Write`.
  - Token de Docker Hub de solo lectura.
  - Comprueba que `dig +short <subdominio>` resuelve a 192.168.122.x desde tu máquina; si tu router filtra respuestas
    con IPs privadas, añade la entrada a `/etc/hosts`.
- [ ] **Step 2:** Escribe los scripts. `shellcheck infra/staging/staging-modo.sh infra/staging/desplegar-caddy.sh` → limpio.
- [ ] **Step 3:** Run `infra/staging/staging-modo.sh --preparar` y después `--estado` → modo `sony-nginx`, las
  carpetas Caddy creadas y compose v2 presente (`docker compose version`).
- [ ] **Step 4: Primer despliegue de AMZ en staging.** Con `ACME_CA` de pruebas en el `.env` de AMZ:
  `staging-modo.sh caddy-amz` y luego
  `desplegar-caddy.sh amz --version-web 4.9.0-s --version-api 2.89.0-s --sembrar-admin <correo del propietario> --admin-nombre "<nombre>"`.
  Esperado: migraciones aplicadas, la contraseña temporal en consola y el certificado emitido por la CA de pruebas
  (`docker compose logs web` muestra "certificate obtained"). Luego quita `ACME_CA`, reinicia `web` y confirma con
  `curl -v https://<subdominio>/` un certificado válido de Let's Encrypt sin `-k`.
- [ ] **Step 5: Puertos ocupados.** Con `caddy-amz` encendido, `staging-modo.sh sony-nginx` → Caddy se detiene, nginx
  arranca y `curl http://$(cat ~/staging-cache/vm-ip)/api/` responde. `update-staging.sh --status` funciona igual que
  antes. Vuelve a `caddy-amz` → nginx detenido y HTTPS de AMZ responde.
- [ ] **Step 6: Ensayo de Sony.** `staging-modo.sh caddy-sony` → se crea el snapshot `pre-caddy-sony-*`.
  `desplegar-caddy.sh sony --version-web 4.9.0-s --version-api <la de staging> ` sin `--permitir-migrar`: si hay
  migraciones pendientes, debe detenerse con un mensaje claro. Esperado: certificado de `staging.telesetalmacen.com` por
  reto DNS de **Linode** y la app de Sony accesible con sus datos.
- [ ] **Step 7: Commit** `infra: staging alterna sony-nginx, caddy-amz y caddy-sony`.

### Task 8: Producción de AMZ, documentación y aceptación

**Files:**
- Create: `docs/infra/procedimiento-alta-amz.md`, `docs/infra/cambio-de-dominio.md`
- Modify: `docs/decisiones.md` (decisión nueva: Caddy en Docker, imágenes en Docker Hub promovidas por digest),
  `docs/README.md` (índice), `CLAUDE.md` raíz (tabla: `infra/`), el spec (corrige "las migraciones no insertan datos")

**Interfaces:**
- Consume todo lo anterior. El procedimiento usa `infra/imagenes/promover.sh` y `infra/clientes/desplegar.sh`.

- [ ] **Step 1: Aceptación en staging (spec §10, criterios 1-4, 7, 8 y 10)** en modo `caddy-amz`, anotando cada
  resultado en el PR:
  - entrar con el administrador sembrado y cambiar la contraseña;
  - crear un movimiento de los tipos que usa la operación (compra 15, préstamo 3, devolución 4);
  - subir un archivo de ~100 MB;
  - recargar en una ruta profunda;
  - verificar que la IP de la sesión en `sesion.IP` es la de tu máquina y no la de la red de Docker;
  - verificar que el correo de alta de usuario llega a mailpit (`:8025`);
  - con DSN de pruebas, un error forzado en la API y otro en el front aparecen en Sentry con `environment=staging`,
    `cliente=amz` y el `release` correcto;
  - PWA: con una pestaña abierta, publicar `chronos-web` con versión de parche nueva y desplegarla hace aparecer el
    aviso en 5 minutos o menos; la app se puede instalar desde Chrome.
- [ ] **Step 2: Escribe `procedimiento-alta-amz.md`**, seguible por alguien sin contexto:
  1. Crear el Linode (Ubuntu 24.04) con Backups activados y Cloud Firewall en 22/80/443.
  2. Instalar `docker.io` y `docker-compose-v2`, usuario `cesargv` en el grupo docker, `docker login` con token de solo
     lectura.
  3. Registro A del subdominio de producción en Cloudflare (nube gris) y token DNS.
  4. Crear `~/chronos-amz/.env` desde `infra/clientes/amz/.env.example`, con `ENTORNO=produccion`, el SMTP de Postmark,
     `SMTP_FROM=chronos-amz@exogrid.xyz`, `SOPORTE_CORREO=soporte@exogrid.io` y secretos nuevos.
  5. `promover.sh web 4.9.0` y `promover.sh api 2.89.0`, y comprobar que los digests son iguales a los de `-s`.
  6. `desplegar.sh --host <amz> --dir ~/chronos-amz --cliente amz --version-web 4.9.0 --version-api 2.89.0 --sembrar-admin …`.
  7. Verificación: certificado, login, cambio de contraseña, correo real recibido, `--estado`.
  8. Configurar la marca en `/configuracion`.
  9. Antes de futuras migraciones: snapshot manual de Linode.
  10. Rollback: volver a la versión anterior en el `.env` y `docker compose up -d`; una migración se revierte con
      `migrar.js revert` o restaurando el snapshot.
- [ ] **Step 3: Escribe `cambio-de-dominio.md`:**
  1. Nuevo registro DNS.
  2. `DOMINIOS="<viejo>, <nuevo>"` y reiniciar `web`.
  3. Avisar a los usuarios.
  4. Tras unas semanas, quitar el viejo.
  5. Por qué no redirigir antes de tiempo (service worker, spec §8).
- [ ] **Step 4: Prueba de `promover.sh`:** `promover.sh web 0.0.0` → sale 1 ("no existe 0.0.0-s").
- [ ] **Step 5: Actualiza `docs/decisiones.md`, `docs/README.md`, `CLAUDE.md` y el spec.** Marca en
  `docs/hallazgos-codigo.md` cualquier hallazgo que se haya corregido de paso (si no hay, no lo toques).
- [ ] **Step 6: Commit** `docs: procedimiento de alta de AMZ, cambio de dominio y decisión de Caddy en Docker`.
- [ ] **Step 7: [propietario] Alta de producción de AMZ** siguiendo el procedimiento: criterio 9 del spec, mismo digest
  que en staging.
