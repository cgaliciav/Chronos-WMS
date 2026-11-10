# Plan 03 · Personalización por cliente: el API sirve la marca y la configuración

> **Para quien ejecute este plan (Sonnet/Opus):** lee primero `CLAUDE.md` raíz, `api/CLAUDE.md`, `front/CLAUDE.md`,
> `docs/decisiones.md` y `docs/hallazgos-codigo.md`. Ejecuta las fases en orden; cada una termina con pruebas verdes y un
> commit (o PR) por app (`api/` y `front/` por separado salvo cambio de contrato, documentado en `docs/api/endpoints.md`).
> Sube la versión de cada app según las reglas de versionado. **Nunca** apliques migraciones ni cambies la configuración
> de producción desde una sesión automatizada: el procedimiento de la fase 5 lo ejecuta una persona.

## 1. Problema

Chronos-WMS nació para un solo cliente (Teleset/Sony México) y su identidad está escrita en el código:

| Dónde | Qué |
|---|---|
| `front/src/app/layouts/Logo.tsx` | `NOMBRE_APP = 'Sony Almacén México'` (también en `LoginPage.tsx`: "Bienvenido a …") |
| `front/src/components/Titulo.tsx`, `RaizLayout.tsx:33` | Títulos de pestaña "Sony Almacén", "Sony México Almacén General" |
| `front/src/stores/usuario.store.ts:54` | Notificación "Has entrado correctamente al Almacén de Sony México" |
| `front/index.html` | `<title>Teleset Almacén</title>`, fuente Mukta de Google Fonts |
| `front/public/manifest.json` | Restos de la plantilla: "Air UI Admin Template", `favicon.ico` inexistente |
| `front/public/resources/images/logo.svg`, `public/favicon.png` | Logo y favicon del cliente |
| `front/src/app/layouts/PieDePagina.tsx` | Crédito EXOGRID, correo de soporte `mailto:` fijo, "Aviso de privacidad" sin enlace |
| `front/src/app/auth/LoginPage.tsx:56` | Texto de ayuda del login |
| `front/src/tema.ts` | Colores (azul `#4b7cf3`…), fuente y radios |
| `front/…/formaEdicionArticulo.tsx:105,226,246` | Moneda `MXN` fija y formato `$ 1,234` |
| `api/src/helpers/enviarMail.ts:19,89-143` | Remitente `telesetalmacen@exogrid.xyz`, asuntos "ALMACEN SONY MX", "TELESET/SONY", soporte `soporte@exogrid.io`, cuerpos fijos |
| `api/src/helpers/enviarMail.ts:6-17` | Transporte SMTP desde variables de entorno, con la cabecera de Postmark fija |
| `api/src/helpers/excelFunctions.ts:854,1689` | Logo de los reportes: archivo `sony-tv-logo.jpg` en `ARCHIVOS_AUXILIARES` |

Para personalizar la app por cliente sin ramas ni builds distintos, la identidad y la configuración deben vivir en
**datos** y no en el código.

## 2. Decisiones de este plan (tomadas por el propietario el 2026-11-10)

| # | Decisión |
|---|---|
| P1 | **El API sirve la marca**: el front, los correos y los reportes Excel toman la identidad de la misma fuente. |
| P2 | La marca, la configuración de correo y el logo del Excel son **configurables desde el front** (pantalla de administración), sin redesplegar. |
| P3 | Todo lo que hoy dice "Sony" (o "Teleset") pasa a **"Chronos WMS"** como valor por defecto del producto. La identidad de cada cliente (incluida la de Sony) se carga como configuración. |
| P4 | Un solo código y un solo build para todos los clientes; **no hay ramas por cliente** (ver §2.6). |

### 2.1 Modelo de datos: tabla `configuracion` por secciones

```ts
// entity/Configuracion.ts (nuevo)
export enum SeccionConfiguracion { MARCA = "marca", CORREO = "correo", REPORTES = "reportes", REGIONAL = "regional" }

@Entity()
export class Configuracion {
  sesionId: number;                                     // auditoría (GeneralSubscriber), como el resto
  @PrimaryColumn({ type: "enum", enum: SeccionConfiguracion }) seccion: SeccionConfiguracion;
  @Column({ type: "json" }) valor: unknown;             // validado con el esquema zod de la sección (src/esquemas/configuracion.ts)
  @Column({ type: "int", default: 1 }) esquema: number; // versión del esquema de esa sección
  @VersionColumn() version: number;                     // bloqueo optimista y ETag
  @UpdateDateColumn() actualizado: Date;
}
```

- Una fila por sección, validada con **zod** al leer y al escribir (`.strict()`: campos desconocidos → 400). Si la fila
  falta o no valida al leer, se usan los **valores por defecto del producto** ("Chronos WMS") y se registra un `warn`:
  la app nunca deja de arrancar por una configuración rota.
- Se descarta reutilizar `Parametros` (llave/valor de texto sin tipos) y un JSON único: por secciones se validan,
  versionan y auditan por separado, y la de correo (con secreto) se puede tratar aparte.
- Los archivos de marca (logo de la app, favicon, logo de reportes) se guardan en `Archivo` (`mediumblob`, igual que
  el resto de archivos) con `tipo` `MARCA-LOGO`, `MARCA-FAVICON`, `REPORTES-LOGO`; la sección guarda su `id`.

Contenido de cada sección (valores por defecto entre paréntesis):

| Sección | Campos |
|---|---|
| `marca` | `nombreApp` ("Chronos WMS"), `nombreCorto` ("Chronos WMS", para la pestaña), `organizacion` ("", nombre del cliente), `textoBienvenida`, `textoAyudaLogin`, `soporteCorreo`, `soporteTelefono?`, `avisoPrivacidadUrl?`, `creditoProveedor` ({ texto: "EXOGRID TECHNOLOGY", url, visible: true }), `logoId?`, `faviconId?`, `tema` ({ colorPrimario: "#4b7cf3", colorEnlaceHover, fuente: "Mukta", radio: 2 }) |
| `correo` | `transporte` ({ host, puerto, seguro, usuario, contrasenaCifrada, cabeceras? }), `remitente` ({ nombre: "Chronos WMS", correo }), `soporteCorreo` (por defecto el de `marca`), `plantillas` (asunto y cuerpo por tipo: `nuevoUsuario`, `nuevoPassword`, `passwordPerdido`, `reporteAnexo`, `reporteDescarga`, `alerta`) |
| `reportes` | `logoId?` (si falta, logo de Chronos WMS empaquetado en el API), `encabezado?` (texto opcional junto al logo) |
| `regional` | `monedaPorDefecto` ("MXN"), `monedas` (["MXN", "USD"]), `locale` ("es-MX"), `zonaHoraria` ("America/Mexico_City") |

Las plantillas de correo admiten variables `{{nombreApp}}`, `{{organizacion}}`, `{{soporteCorreo}}`, `{{correo}}`,
`{{clave}}`, `{{archivo}}`, `{{enlace}}`, `{{alerta}}`; se sustituyen como texto plano (sin evaluar código) y una
variable desconocida en la plantilla → 400 al guardar.

### 2.2 Endpoints (nuevo recurso `/config`)

| Método y ruta | Auth | Qué hace |
|---|---|---|
| `GET /config/public` | **Ninguna** (la pantalla de login la necesita) | Solo lo público: `marca` sin campos internos, `regional`, URLs de logo y favicon, `version`. `ETag` + `Cache-Control: no-cache` (el front revalida barato). |
| `GET /config/public/logo`, `/config/public/favicon` | Ninguna | Imagen de marca desde `Archivo` (o la de Chronos WMS por defecto). Solo estos `tipo`: nunca sirve otros archivos. |
| `GET /config` | `ADMINISTRADOR`, `CONFIGURACION-EDITAR` | Todas las secciones. **La contraseña SMTP nunca sale**: se devuelve `transporte.tieneContrasena: true/false`. |
| `PUT /config/:seccion` | Igual | Reemplaza una sección. Cuerpo validado con zod; exige `version` (409 si otro la cambió antes). Contraseña SMTP solo de escritura: ausente = se conserva; `null` = se borra. |
| `POST /config/marca/logo`, `/marca/favicon`, `/reportes/logo` | Igual | Sube la imagen (multer, límite de tamaño, solo PNG/JPEG/SVG/ICO según el caso). `sharp` normaliza: logo a PNG ≤ 512 px, favicon a PNG 32/192 px, logo de reportes a PNG/JPEG (exceljs no admite SVG). SVG se sanea o se rechaza (riesgo XSS al servirlo). |
| `POST /config/correo/prueba` | Igual | Envía un correo de prueba con la configuración guardada al correo del usuario que lo pide y devuelve el resultado SMTP (sin la contraseña). |

`GET /config/public` sustituye la necesidad de leer la marca del build; el `GET /auth/version` existente no cambia.

### 2.3 Secretos y seguridad

- La contraseña SMTP se guarda **cifrada** (AES-256-GCM, `node:crypto`) con la clave de la variable de entorno
  `CONFIG_CLAVE` (32 bytes en base64, en `.env`/secretos del servidor, nunca en la BD). Sin `CONFIG_CLAVE`, el API
  arranca pero rechaza guardar contraseñas (400 con mensaje claro) y usa el transporte de las variables `SMTP_*`.
- El suscriptor de auditoría registra los cambios de configuración **sin** el valor cifrado (se enmascara antes de
  escribir `LogFuncionamiento`). Los logs de pino tampoco lo imprimen (`redact`).
- `GET /config/public` es público por diseño: no debe contener nada que no se muestre en la pantalla de login.

### 2.4 Correo fuera de producción (crítico)

Staging restaura la **base de producción**: si la configuración SMTP vive en la BD, staging heredaría las credenciales
reales y podría escribir a usuarios reales. Hoy lo impiden mailpit + el alias `smtp.postmarkapp.com` + iptables
(`infra/staging/README.md`), pero el host podría ser otro. Por eso:

- Nueva variable `SMTP_ANULAR` (`host:puerto`): si existe, **gana sobre la BD** y desactiva usuario/contraseña. Se
  define en staging (`mailpit:1025`) y en desarrollo (`127.0.0.1:1025`, `api/.env`); en producción no existe.
- Al arrancar, el API registra en `info` qué transporte usa (`bd`, `anulado` o `entorno`), sin secretos.
- El bloqueo de SMTP saliente de staging se mantiene (defensa en profundidad).

### 2.5 Front

- `stores/marca.store.ts` (Zustand): carga `GET /config/public` **antes** del primer render (`index.tsx`); mientras
  tanto se ve el cargador neutro de `index.html`. Si el API falla, usa los valores por defecto de Chronos WMS (la app
  sigue funcionando) y reintenta en la siguiente navegación.
- Consumidores: `Logo`, `LoginPage`, `PieDePagina`, `Titulo`/`RaizLayout` (título de pestaña), notificación de
  bienvenida, favicon (`<link rel="icon">` se actualiza en tiempo de ejecución), `ConfigProvider` (tokens de color y
  fuente desde `marca.tema` sobre `tema.ts`), moneda y formato (`regional`).
- `index.html` y `manifest.json` quedan neutros ("Chronos WMS"); el manifest se puede servir dinámico más adelante.
- Pantalla `/configuracion` (menú de administración, `ACL` `ADMINISTRADOR`/`CONFIGURACION-EDITAR`) con pestañas
  Marca, Correo, Reportes y Regional; vista previa de logo y colores; botón "Enviar correo de prueba".
- Las variables `VITE_*` quedan solo para lo del build (`VITE_API_URL`, `VITE_SENTRY_DSN`).

### 2.6 Por qué no ramas por cliente

Cada corrección habría que llevarla a N ramas (cherry-pick) y la versión `vX.Y.Z` dejaría de identificar lo
desplegado. Con este plan la versión de la app es la misma para todos; lo que cambia por cliente son **datos**
(tabla `configuracion` y archivos de marca), auditados por el suscriptor y respaldados con la BD. Para alta de
clientes nuevos y entornos desechables, la configuración se puede exportar e importar como JSON (fase 5).

## 3. Fases

### Fase 0 · Valores por defecto "Chronos WMS" (sin modelo nuevo) ✅ (hecha el 2026-11-10; API v2.85.0, front v4.4.0)

> **Resultado:** `front/src/app/marca.ts` (no en la raíz de `src`: la guía del front evita nombres que choquen con
> paquetes npm) y `api/src/recursos/logoReportes.ts` (el PNG va en base64 para que el build no tenga que copiar
> archivos). Logo y favicon del front ya eran neutros (anillo de la plantilla); siguen pendientes los oficiales.
> Pruebas-guardia `sinMarcaDeCliente.test.ts` en ambas apps; única excepción, `LOGO_HISTORICO` (paso 3).
> El correo personal de soporte del pie se sustituyó por `soporte@exogrid.io`.

Cambio rápido e independiente; deja el código sin referencias a Sony/Teleset antes de mover nada a datos.

1. Front: centralizar los textos de marca en `src/marca.ts` (`MARCA_POR_DEFECTO`: nombre "Chronos WMS", textos,
   soporte, crédito) y usarlo en `Logo`, `LoginPage`, `Titulo`, `RaizLayout`, `usuario.store`, `PieDePagina`.
2. Front: `index.html` (`<title>Chronos WMS</title>`), `manifest.json` corregido (nombre, `favicon.png`, colores),
   logo y favicon neutros de Chronos WMS (**el propietario provee los archivos**; mientras, un SVG de texto).
3. API: asuntos y cuerpos de `enviarMail.ts` con "Chronos WMS"; `SMTP_FROM` por defecto sin dominio de Teleset;
   soporte desde una constante; logo de reportes por defecto empaquetado en `api/src/recursos/` (con
   `sony-tv-logo.jpg` como alternativa mientras exista en `ARCHIVOS_AUXILIARES`, para no cambiar los reportes de Sony
   antes de la fase 5).
4. Pruebas: una prueba (front y API) que falle si aparece `/sony|teleset/i` en `src/` fuera de pruebas y migraciones.

**Aceptación:** `grep -riE "sony|teleset" front/src front/index.html front/public api/src` sin resultados (salvo la
alternativa temporal documentada del paso 3); suites verdes; checklist de humo 0.x y login.

### Fase 1 · API: modelo, servicio y endpoints de configuración ✅ (hecha el 2026-11-10, API v2.86.0)

> **Resultado y desviaciones:** `valor` es `simple-json` (texto) y no `json`: MariaDB guarda `json` como LONGTEXT y el
> generador de migraciones vería diferencias en cada `test:int`. SVG se **rechaza** (no se sanea) e ICO también (sharp
> no lo lee): se aceptan PNG/JPEG/WebP. `PUT` recibe `{ version, valor }`. La plantilla `passwordPerdido` no se incluye
> (el flujo de contraseña perdida es la regeneración temporal de L2) y se añade la variable `{{horas}}`. La migración
> congela los JSON por defecto (una migración publicada no cambia si cambia el código). La auditoría enmascara
> secretos (M40). El rol se recrea con id fijo en `seed.ts`.

1. Entidad `Configuracion` + migración (`npm run migration:generate -- Configuracion`) que crea la tabla e **inserta
   las secciones con los valores por defecto** de Chronos WMS (idempotente).
2. `src/esquemas/configuracion.ts`: un esquema zod por sección y por versión de esquema.
3. `src/services/ConfiguracionService.ts`: `leer(seccion)` con caché en memoria invalidada al guardar (y por
   `version`, por si hay varias instancias), `guardar(seccion, valor, version, sesionId)` transaccional,
   valores por defecto si falta o no valida, cifrado/descifrado de la contraseña (`helpers/cifrado.ts`).
4. Rutas `src/routes/configuracion.Routes.ts` (§2.2) con `checkJwt` + `checkRole` salvo las públicas; rol nuevo
   `CONFIGURACION-EDITAR` en la migración y en `seed.ts`.
5. Subida de imágenes con multer + sharp (normalización, límites, SVG saneado o rechazado).
6. Pruebas de integración `configuracion.int.test.ts`: público sin token y sin secretos, 401/403 en los
   administrativos, 400 por esquema, 409 por `version`, la contraseña nunca sale en ninguna respuesta ni en la
   auditoría, imágenes válidas e inválidas, valores por defecto con la tabla vacía. Unitarias de cifrado y esquemas.
7. `docs/api/endpoints.md` (recurso `/config`), `docs/api/modelo-de-datos.md`, `api/.env.example` (`CONFIG_CLAVE`,
   `SMTP_ANULAR`).

**Aceptación:** `npm test` y `npm run typecheck` verdes; la migración reproduce la entidad (`test:int`);
`GET /config/public` responde con "Chronos WMS" en una BD recién migrada.

### Fase 2 · API: correo y reportes desde la configuración

1. `enviarMail.ts` → `services/CorreoService.ts`: transporte construido desde `correo.transporte` (o `SMTP_ANULAR`,
   o `SMTP_*` como respaldo) y **recreado cuando cambia la `version`**; sin cabecera de Postmark fija (va en
   `cabeceras` si el cliente la necesita). Se mantiene la interfaz `EnviarMail.correoNuevoUsuario(…)` para no tocar
   los controladores.
2. Plantillas: render de `{{variables}}` (función pura con pruebas); remitente `"nombre" <correo>`.
3. `POST /config/correo/prueba`.
4. `excelFunctions.ts`: el logo sale de `reportes.logoId` (buffer desde `Archivo`, `workbook.addImage({ buffer })`)
   con el de Chronos WMS por defecto; se elimina la dependencia de `ARCHIVOS_AUXILIARES/sony-tv-logo.jpg`.
5. Pruebas: correo de prueba contra mailpit (o un transporte simulado de nodemailer) con plantillas y remitente
   configurados; `SMTP_ANULAR` gana sobre la BD; un reporte Excel generado contiene la imagen configurada.

**Aceptación:** con la tabla en valores por defecto, los correos llegan a mailpit con asuntos "Chronos WMS";
al cambiar la plantilla por `PUT /config/correo`, el siguiente correo la usa sin reiniciar; el Excel lleva el logo
configurado.

### Fase 3 · Front: aplicar la marca

1. `services/axios/configuracion` (clase sobre `PeticionBase`) y `stores/marca.store.ts` (§2.5).
2. `index.tsx` espera la marca antes de renderizar; `ConfigProvider` combina `tema.ts` con `marca.tema`.
3. Sustituir `MARCA_POR_DEFECTO` (fase 0) por el store en todos los consumidores; favicon dinámico.
4. Moneda y formato desde `regional` en `formaEdicionArticulo` (y helper de formato monetario en `helpers/`).
5. Pruebas (Vitest + MSW): renderiza con una marca de ejemplo (nombre, logo, colores, soporte) y con el API caído
   (valores por defecto).

**Aceptación:** cambiando la fila `marca` en la BD y recargando, el login, el menú, el pie, la pestaña y los colores
muestran la nueva marca sin rebuild; con el API apagado el login muestra "Chronos WMS" y el error de conexión.

### Fase 4 · Front: pantalla de configuración

1. Ruta `/configuracion` (lazy, en `router.tsx` e `inventario-rutas.md`) con pestañas Marca, Correo, Reportes y
   Regional; formularios `Form.useForm` con la misma validación que el esquema zod del API (mensajes del 400).
2. Subida de logo, favicon y logo de reportes con vista previa; selector de color con vista previa del tema.
3. Correo: campos del transporte, contraseña solo de escritura ("guardada" / "cambiar"), plantillas con la lista de
   variables y botón "Enviar correo de prueba".
4. Conflictos: un 409 recarga la sección y avisa de que otra persona la cambió.
5. Pruebas de componentes y checklist de humo nuevo (sección 11: configuración).

**Aceptación:** un administrador cambia nombre, logo, colores, plantillas y SMTP desde la pantalla; el cambio se ve
al recargar (marca) o en el siguiente correo/reporte, sin redesplegar; un usuario sin el rol recibe `/auth/401`.

### Fase 5 · Despliegue, Sony como primer cliente configurado y alta de clientes

1. Exportar/importar configuración: `GET /config/export` (sin secretos) y `POST /config/import` (admin), para
   clonar la configuración entre entornos y dar de alta clientes.
2. Staging: `SMTP_ANULAR=mailpit:1025` y `CONFIG_CLAVE` propia en `docker-compose.staging.yml`; `update-staging.sh`
   verifica tras desplegar que el transporte activo es `anulado`. Ensayo completo del procedimiento sobre la copia de
   producción.
3. Procedimiento de producción en `docs/api/procedimiento-migracion-produccion.md` (lo ejecuta una persona):
   generar `CONFIG_CLAVE`, migrar, y **cargar la marca de Sony** (nombre, logo, soporte, plantillas, logo de reportes
   `sony-tv-logo.jpg`, SMTP de Postmark) con la importación o la pantalla, para que los usuarios actuales no vean
   cambios de identidad. Verificación: correo de prueba y un reporte.
4. Retirar el respaldo temporal de `sony-tv-logo.jpg` (fase 0, paso 3) y las variables `SMTP_*` como fuente
   principal (quedan como respaldo documentado).

**Aceptación:** staging con datos de producción muestra la marca de Sony cargada por configuración, sus correos solo
llegan a mailpit, y una BD nueva muestra "Chronos WMS" sin configurar nada.

## 4. Orden y dependencias

```
F0 textos por defecto ─▶ F1 API configuración ─▶ F2 correo y Excel ─┐
                                    └──────────▶ F3 front marca ─▶ F4 pantalla ─▶ F5 despliegue
```

- La fase 0 es independiente y se puede hacer ya.
- La **fase 5 del plan 02** (Express 5, multer 2, `sharp` y `nodemailer` mayores) toca los mismos archivos que las
  fases 1 y 2 (subidas, imágenes, correo). Ya está hecha (PR #6, API v2.81.0-d): las fases 1-2 se escriben contra las
  APIs nuevas de esas librerías.
- La fase 7 del plan 02 (notificaciones propias) podrá reutilizar `CorreoService` y sus plantillas.

## 5. Cambios de contrato con el front

- Nuevo recurso `/config` (§2.2), documentado en `docs/api/endpoints.md`.
- El front deja de traer la marca en el build: necesita `GET /config/public` (con valores por defecto si falla).
- Rol nuevo `CONFIGURACION-EDITAR`.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Staging hereda el SMTP real de producción desde la BD | `SMTP_ANULAR` gana sobre la BD + bloqueo de SMTP saliente + verificación en `update-staging.sh` (§2.4). |
| Fuga de la contraseña SMTP | Cifrado con `CONFIG_CLAVE`, solo de escritura, enmascarada en auditoría y logs; pruebas que lo comprueban. |
| Configuración inválida deja la app sin arrancar o en blanco | Validación zod al escribir; al leer, valores por defecto + `warn`. |
| SVG malicioso servido sin token | Sanear o rechazar SVG; servir con `Content-Type` correcto y `Content-Security-Policy` restrictiva; solo `tipo` de marca. |
| Usuarios de Sony ven "Chronos WMS" tras desplegar | El procedimiento de la fase 5 carga la marca de Sony en la misma ventana de despliegue; ensayado en staging. |
| El login tarda más por la petición extra | `GET /config/public` es pequeño, en caché de memoria y con `ETag`; el cargador de `index.html` cubre la espera. |

## 7. Puntos a revisar sobre la marcha con el propietario

- Logo y favicon oficiales de **Chronos WMS** (fase 0): hasta tenerlos se usa un SVG de texto.
- ¿El crédito "EXOGRID TECHNOLOGY" del pie se puede ocultar por cliente (marca blanca) o es fijo? (El plan lo deja
  configurable con `creditoProveedor.visible`.)
- ¿Las contraseñas deben seguir enviándose en claro por correo (hallazgo **L2**)? Las plantillas nuevas son el momento
  de cambiarlo por un enlace de restablecimiento.
- ¿Hace falta activar o desactivar módulos por cliente (rentas externas, previos, validaciones, inventario visual)?
  Si sí, se añade una sección `modulos` en una fase posterior; hoy los roles ya ocultan menús por usuario.
- ¿Habrá un despliegue (API + BD) por cliente, o varios clientes en la misma instancia? Este plan asume **una
  instancia por cliente**; multi-cliente en una instancia requeriría `clienteId` en todas las tablas y está fuera de
  alcance.
