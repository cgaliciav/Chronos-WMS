// Humo funcional: login → destino → menú por permisos → ACL redirige → F5 mantiene sesión → logout.
const http=require('http'),fs=require('fs'),path=require('path'); const { chromium } = require('playwright')
const build=process.argv[2]
const srv=http.createServer((q,r)=>{let f=path.join(build,decodeURIComponent(q.url.split('?')[0]));if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(build,'index.html');r.writeHead(200,{'Content-Type':{'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r)}).listen(0)
const base=`http://localhost:${srv.address().port}`
;(async()=>{
  const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1440,height:900}}); const p=await c.newPage()
  const errores=[]; p.on('pageerror',e=>errores.push(e.message)); const cuerpos=[]
  await c.route(/\/api\//,async r=>{const q=r.request();const u=new URL(q.url()).pathname.replace(/^\/api/,'')
    let body={}
    if(u==='/auth/login'){cuerpos.push(q.postDataJSON());body={t:'tk'}}
    else if(u==='/user/current') body=q.headers()['auth']?{id:1,nombre:'Ana Pruebas',correo:'ana@x.mx',roles:['V-CATALOGOS-TITULO','V-CATALOGO-MENU','V-CATALOGO-GENERAL']}:null
    else if(/antd|list-catalog/.test(u)) body={results:[],pagination:{current:1,pageSize:10,total:0}}
    else if(/get-|list/.test(u)) body=[]
    if(body===null) return r.fulfill({status:401,contentType:'application/json',body:'{"message":"sin token"}'})
    r.fulfill({contentType:'application/json',body:JSON.stringify(body)})})
  const paso=(n,ok,x='')=>console.log(`${ok?'✅':'❌'} ${n} ${x}`)
  await p.goto(`${base}/catalogo/general`); await p.waitForTimeout(1500)
  paso('sin sesión redirige a login', p.url().endsWith('/auth/login'), p.url())
  await p.fill('input[autocomplete=username], input[placeholder=Email]','ana@x.mx'); await p.fill('input[type=password]','x'); await p.click('button[type=submit]'); await p.waitForTimeout(2500)
  paso('login envía {c,p} sin ip', JSON.stringify(cuerpos[0])==='{"c":"ana@x.mx","p":"x"}', JSON.stringify(cuerpos[0]))
  paso('tras login va a la última ruta visitada', p.url().endsWith('/catalogo/general'), p.url())
  paso('título de la página', (await p.title())==='Sony Almacén | Catálogo General', await p.title())
  const menu=await p.locator('.ant-menu-submenu-title').allInnerTexts()
  paso('menú solo con entradas permitidas', menu.length===1 && /Catálogos/.test(menu[0]), JSON.stringify(menu))
  await p.goto(`${base}/compras/nuevo`); await p.waitForTimeout(1500)
  paso('ACL sin rol redirige a 401', p.url().endsWith('/auth/401'), p.url())
  await p.goto(`${base}/no-existe`); await p.waitForTimeout(800)
  paso('ruta inexistente → 404', p.url().endsWith('/auth/404'), p.url())
  await p.goto(`${base}/catalogo/general`); await p.reload(); await p.waitForTimeout(1500)
  paso('F5 mantiene la sesión', p.url().endsWith('/catalogo/general') && (await p.locator('text=Ana Pruebas').count())>0)
  await p.click('.ant-avatar'); await p.waitForTimeout(500); await p.click('text=Salir'); await p.waitForTimeout(1500)
  paso('logout vuelve al login y borra token', p.url().endsWith('/auth/login') && (await p.evaluate(()=>localStorage.getItem('t')))===null, p.url())
  paso('sin errores de página', errores.length===0, errores.join(' | '))
  await b.close(); srv.close()
})()
