# Línea base visual del front legado (plan 01, fase 0)

Capturas de las 10 rutas críticas del front **antes** de cualquier cambio del plan 01 (commit `8aabbda`),
para comparar al cerrar cada fase (la fase 6 guardará las suyas en `docs/front/after/`).

## Cómo se obtuvieron (2026-11-07)

1. El legado **sí compila** con Node 14.21.3 y Yarn 1.22.22 (node-sass 4.14 descarga su binario
   precompilado para Node 14):
   ```bash
   # con Node 14 en el PATH (nvm install 14 && nvm use 14)
   yarn install --frozen-lockfile --ignore-engines   # --ignore-engines: package.json ya declara node >=24
   CI=false NODE_OPTIONS=--max-old-space-size=4096 yarn build   # ≈ 4 min, "Compiled successfully"
   ```
2. `node capturar.js <front/build> <salida>` sirve `build/` con un servidor estático y abre cada ruta con
   Playwright (Chromium, 1440×900, `deviceScaleFactor` 1). El API se simula interceptando `/api/**`
   (`respuestaSimulada` en el script): usuario `ADMINISTRADOR`, tablas vacías, un grupo y un movimiento
   de ejemplo. `api.ipify.org` se simula y MagicBell se bloquea (se elimina en la fase 1).
3. Criterio: ninguna ruta produjo `pageerror` ni errores de consola salvo el aborto intencional de MagicBell.
   `peticiones.json` lista las peticiones al API que hizo cada ruta al cargar.

## Notas

- Con datos simulados incompletos, `/movimientos/detalle` falla si el producto no tiene un precio con
  `precioTipo.id === 2` (`pages/operaciones/componentes/articuloMovimiento.js:43`, `find(...).precio`
  sin comprobar `undefined`). Anotado en `docs/hallazgos-codigo.md` (F22).
- Las capturas son de referencia de **maquetación**, no de datos: comparar estructura, menú, cabeceras,
  formularios y tablas.
