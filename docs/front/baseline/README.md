# Línea base visual del front legado (plan 01, fase 0)

Capturas de las 10 rutas críticas del front **antes** de cualquier cambio del plan 01 (commit `8aabbda`),
para comparar al cerrar cada fase (la fase 6 guardará las suyas en `docs/front/after/`).

## Cómo se obtuvieron (2026-11-07)

1. El legado (cualquier commit anterior a la fase 2, p. ej. `8aabbda`) **sí compila** con Node 14.21.3 y Yarn 1.22.22 (node-sass 4.14 descarga su binario
   precompilado para Node 14):
   ```bash
   # con Node 14 en el PATH (nvm install 14 && nvm use 14)
   yarn install --frozen-lockfile --ignore-engines   # --ignore-engines: package.json ya declara node >=24
   CI=false NODE_OPTIONS=--max-old-space-size=4096 yarn build   # ≈ 4 min, "Compiled successfully"
   ```
2. `node capturar.js <front/build | URL> <salida>` sirve `build/` con un servidor estático (o usa la URL dada) y abre cada ruta con
   Playwright (Chromium, 1440×900, `deviceScaleFactor` 1). El API se simula interceptando `/api/**`
   (`respuestaSimulada` en el script): usuario `ADMINISTRADOR`, tablas vacías, un grupo y un movimiento
   de ejemplo. `api.ipify.org` se simula y MagicBell se bloquea (se elimina en la fase 1).
3. Criterio: ninguna ruta produjo `pageerror` ni errores de consola salvo el aborto intencional de MagicBell.
   `peticiones.json` lista las peticiones al API que hizo cada ruta al cargar.

## Notas

- Con datos simulados incompletos, `/movimientos/detalle` falla si el producto no tiene un precio con
  `precioTipo.id === 2` (`pages/operaciones/componentes/articuloMovimiento.jsx:43`, `find(...).precio`
  sin comprobar `undefined`). Anotado en `docs/hallazgos-codigo.md` (F22).
- Las capturas son de referencia de **maquetación**, no de datos: comparar estructura, menú, cabeceras,
  formularios y tablas.

## Comparaciones por fase

`capturar.js` acepta como primer argumento una carpeta `build/` o la URL de un servidor ya levantado
(`npm run dev` / `npm run preview`). Para comparar píxel a píxel basta con cualquier herramienta de diff de
imágenes; en las fases 1 y 2 se contaron los píxeles con diferencia de color > 30 (suma RGB).

| Fase | Capturas | Resultado |
|---|---|---|
| 1 (borrado de plantilla) | — (idénticas) | Solo cambia la campana de MagicBell (retirada). |
| 6 (antd puro, sin Clean UI, 100 % TS) | [`../after/`](../after/) | Layout nuevo: menú lateral de antd con iconos de `@ant-design/icons`, cabecera blanca, migas de antd, login en tarjeta, errores con `Result`. Las páginas conservan su estructura con `Card` y `Typography`. Sin errores en las 67 rutas (F36 resuelto). |
| 5 (antd 6) | — (idénticas a la fase 4) | < 0,25 % frente a la fase 4 (subpíxel). Sin avisos en `dev` en las 67 rutas. |
| 4 (antd 5, dayjs, React 19, Router 8) | [`fase-4/`](fase-4/) | ≈ 3 % frente a la fase 2 (tipografía y controles de antd 5: paginación sin bordes, selector de tamaño también abajo, iconos). Textos de antd en español. Sin avisos en `dev` en las 67 rutas. |
| 3 (React 18, Router 7, Zustand, servicios TS) | — (idénticas a la fase 2) | 0 % salvo los nombres por defecto con marca de tiempo. Humo de sesión con `flujo-sesion.js`: 10/10. |
| 2 (CRA → Vite, antd 4.2 → 4.24) | [`fase-2/`](fase-2/) | 0,2-0,7 % de píxeles distintos en 9 rutas; 18 % en `prestamos-operacion`. Sin errores de consola en `build`, `preview` ni `dev` (solo avisos de deprecación de antd 4.24 en `dev`, que resuelve la fase 4). |

Diferencias aceptadas en la fase 2, todas por la subida a antd 4.24 o por retiradas previstas en el plan:

- Desaparece el botón flotante del panel de ajustes (`Sidebar`, D10: sin selector de tema).
- `Typography.Title level={5}`: antd 4.2 no tenía el nivel 5 y lo pintaba como un título grande; 4.24 lo pinta
  como h5 (origen del 18 % de `prestamos-operacion`: "Almacenista" y "Usuarios" ahora miden lo que pretendía el código).
- Placeholders de `Select` algo más oscuros (antd 4.24 usa `@input-placeholder-color` en vez de `opacity: .4`).
- Paginación sin resultados muestra "1" en vez de "0"; iconos de orden/filtro de `Table` y flecha de submenús
  con el diseño de 4.24; separación entre pestañas de `Tabs` ligeramente mayor.

Dos diferencias que **sí** eran regresiones se corrigieron en `src/styles/antd.less` y `vite.config.ts`: la cascada
antd ↔ `kit-vendors` (envoltorio `[data-kit-theme='default']` + plugin PostCSS) y la altura de los títulos de grupo
del menú (el minificador de CSS convertía `height: 1.5715` en `1.5715px`).

## Humo de sesión automatizado (`flujo-sesion.js`)

`node flujo-sesion.js <front/build>` sirve el build, simula el API y comprueba: redirección al login sin sesión,
login con `{ c, p }` sin `ip`, vuelta a la última ruta, título, menú filtrado por permisos, ACL → `/auth/401`,
ruta inexistente → `/auth/404`, F5 con sesión, logout (borra el token) y ausencia de `pageerror`.
