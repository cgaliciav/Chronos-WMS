// Capturas de referencia del front legado con el API simulado (route interception de Playwright).
// Uso: node capturar.js <dir-build | URL de un servidor ya levantado> <dir-salida>
const http = require('http')
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const [buildDir, outDir] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })

const tipos = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
const externo = /^https?:/.test(buildDir)
const server = externo ? null : http.createServer((req, res) => {
  let f = path.join(buildDir, decodeURIComponent(req.url.split('?')[0]))
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(buildDir, 'index.html')
  res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
}).listen(0)
const base = externo ? buildDir.replace(/\/$/, '') : `http://localhost:${server.address().port}`

const tabla = { results: [], pagination: { current: 1, pageSize: 10, total: 0, totalItems: 0 }, filtered: 0 }
const usuario = { id: 1, correo: 'admin@prueba.mx', nombre: 'Administrador Prueba', avatar: '', roles: ['ADMINISTRADOR'] }
const grupo = {
  id: 1, nombre: 'Grupo de prueba', estatus: 'activo', comentarios: [], archivos: [],
  grupoDetalle: { movimientoTipo: { id: 3, nombre: 'Préstamo' }, proyecto: { id: 1, nombre: 'Proyecto prueba', estatus: 'activo' }, usuarios: [{ id: 2, nombre: 'Usuario responsable' }] },
}
const movimiento = {
  id: 1, cantidad: 1, grupos: [],
  operacion: { id: 1, comentarios: [], archivos: [], movimientoTipo: { id: 3, nombre: 'Préstamo' } },
  inventarioActual: { id: 1, cantidad: 1, producto: { id: 1, titulo: 'Artículo de prueba', descripcion: 'Descripción simulada', productoPrecios: [{ id: 1, precio: 1500, precioTipo: { id: 2, nombre: 'Venta' } }], productoClaves: [{ id: 1, barras: 'ABC123' }], archivos: [], area: { nombre: 'Área prueba' } }, bodega: { nombre: 'Almacén prueba' } },
}

function respuestaSimulada(url, method) {
  const p = new URL(url).pathname.replace(/^\/api/, '')
  if (p === '/auth/login') return { t: 'token-prueba' }
  if (p === '/auth/version') return { version: 'simulado' }
  if (p === '/user/current') return usuario
  if (p === '/notifications/' || p === '/notifications') return [] // la campana espera una lista (v4.2)
  if (p === '/notifications/count') return { noLeidas: 0 }
  if (/antd|list-by|activity/.test(p) && method !== 'GET') return tabla
  if (/antd/.test(p)) return tabla
  if (/list-names|get-|list|names|catalog/.test(p)) return []
  if (/groups\/\d+$/.test(p)) return grupo
  if (/activity\/\d+$/.test(p)) return movimiento
  return {}
}

const rutas = [
  ['auth-login', '/auth/login', false],
  ['catalogo-general', '/catalogo/general', true],
  ['catalogo-por-codigos', '/catalogo/por-codigos', true],
  ['prestamos-nuevo', '/prestamos/nuevo', true],
  ['prestamos-operacion', '/prestamos/operacion?uid=1', true],
  ['devoluciones-nuevo', '/devoluciones/nuevo', true],
  ['compras-nuevo', '/compras/nuevo', true],
  ['compras-operacion', '/compras/operacion?uid=1', true],
  ['bajas-nuevo', '/bajas/nuevo', true],
  ['movimientos-detalle', '/movimientos/detalle?uid=1', true],
]

;(async () => {
  const browser = await chromium.launch()
  const informe = []
  for (const [nombre, ruta, conSesion] of rutas) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    if (conSesion) await context.addInitScript(() => localStorage.setItem('t', 'token-prueba'))
    const page = await context.newPage()
    const errores = []
    const peticiones = new Set()
    page.on('pageerror', e => errores.push(`pageerror: ${e.message.split('\n')[0]}`))
    page.on('console', m => { if (m.type() === 'error') errores.push(`console: ${m.text().split('\n')[0].slice(0, 160)}`) })
    await context.route('https://api.ipify.org/**', r => r.fulfill({ body: '127.0.0.1' }))
    await context.route(/\/api\//, r => {
      const req = r.request()
      peticiones.add(`${req.method()} ${new URL(req.url()).pathname.replace(/^\/api/, '')}`)
      r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(respuestaSimulada(req.url(), req.method())) })
    })
    await context.route(/magicbell/, r => r.abort())
    // El SSE de notificaciones no se simula: la campana pasa a sondeo.
    await context.route(/\/api\/notifications\/stream/, r => r.abort())
    await page.goto(`${base}${ruta}`) // rutas sin # desde v4.1
    await page.waitForTimeout(externo ? 6000 : 3500)
    await page.screenshot({ path: path.join(outDir, `${nombre}.png`) })
    informe.push({ nombre, ruta, url: page.url().replace(base, ''), errores: [...new Set(errores)], peticiones: [...peticiones] })
    await context.close()
  }
  await browser.close()
  if (server) server.close()
  fs.writeFileSync(path.join(outDir, 'informe.json'), JSON.stringify(informe, null, 2))
  for (const i of informe) console.log(`${i.nombre} → ${i.url} | errores: ${i.errores.length} | ${i.peticiones.join(', ')}`)
})()
