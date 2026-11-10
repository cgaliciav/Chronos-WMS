/**
 * Plan 02 · fase 7: notificaciones propias. Reportes que avisan al terminar o fallar, conteo y lectura, aislamiento
 * entre usuarios, Server-Sent Events, avisos de préstamos vencidos y retención.
 */
import "./env";
import { Express } from "express";
import { mkdirSync } from "fs";
import http from "http";
import { AddressInfo } from "net";
import sharp from "sharp";
import { crearApp } from "../app";
import { AppDataSource } from "../data-source";
import { logger } from "../helpers/logger";
import NotificacionService from "../services/NotificacionService";
import { cerrarPruebas, conectarPruebas } from "./conexion";
import { clienteAdmin, clienteOperador, crearArticulo, crearGrupoDetalle, registrarOperacion, tokenOperador } from "./factories";
import { SEMILLA } from "./seed";

const esperarHasta = async <T>(fn: () => Promise<T>, condicion: (v: T) => boolean, ms = 10000) => {
  const inicio = Date.now();
  let valor = await fn();
  while (!condicion(valor) && Date.now() - inicio < ms) {
    await new Promise((r) => setTimeout(r, 100));
    valor = await fn();
  }
  return valor;
};

describe("fase 7 · notificaciones", () => {
  let app: Express;
  let admin: ReturnType<typeof clienteAdmin>;
  let operador: ReturnType<typeof clienteOperador>;

  const noLeidas = async (api: ReturnType<typeof clienteAdmin>) => (await api.get("/notifications/count")).body.noLeidas as number;
  const lista = async (api: ReturnType<typeof clienteAdmin>, consulta = "") => (await api.get(`/notifications${consulta}`)).body as any[];

  beforeAll(async () => {
    await conectarPruebas();
    app = crearApp();
    admin = clienteAdmin(app);
    operador = clienteOperador(app);
    // Los reportes incrustan el logo de ARCHIVOS_AUXILIARES (como en humoArchivosReportes).
    mkdirSync(process.env.ARCHIVOS_AUXILIARES as string, { recursive: true });
    await sharp({ create: { width: 40, height: 20, channels: 3, background: "#000" } })
      .jpeg()
      .toFile(`${process.env.ARCHIVOS_AUXILIARES}sony-tv-logo.jpg`);
  });
  afterAll(cerrarPruebas);

  it("generar un reporte crea una notificación para el solicitante con el enlace de descarga", async () => {
    const grupoId = (await crearGrupoDetalle(admin, 14)).id;
    await crearArticulo(admin, { grupoId, cantidad: 1, movimientoTipoId: 14 });
    const ultimoId = Math.max(0, ...(await lista(admin)).map((n) => n.id));

    const res = await admin
      .post("/reports/by-group")
      .send({ grupoId, grupoNombre: "Notificaciones", movimientoTipoNombre: "ALTA", conFoto: false, filters: {} });
    expect(res.status).toBe(200);

    const nuevas = await esperarHasta(
      async () => (await lista(admin)).filter((n) => n.id > ultimoId && n.tipo === "reporte"),
      (ns) => ns.length > 0
    );
    expect(nuevas).toHaveLength(1);
    expect(nuevas[0]).toMatchObject({ titulo: "Reporte generado", leida: false, fechaLectura: null });
    expect(nuevas[0].url).toMatch(/^\/file\/report\/.+\.xlsx$/);
    expect(nuevas[0]).not.toHaveProperty("clave");
    const descarga = await admin.get(nuevas[0].url);
    expect(descarga.status).toBe(200);
    // El operador no la ve
    expect((await lista(operador)).some((n) => n.id === nuevas[0].id)).toBe(false);
  });

  it("si el reporte falla, notifica el error (y el proceso sigue vivo: H8)", async () => {
    const ultimoId = Math.max(0, ...(await lista(admin)).map((n) => n.id));
    expect((await admin.post("/reports/by-project-final").send({})).status).toBe(200); // sin proyectoId → falla al generar
    const [error] = await esperarHasta(
      async () => (await lista(admin)).filter((n) => n.id > ultimoId && n.tipo === "reporte"),
      (ns) => ns.length > 0
    );
    expect(error).toMatchObject({ titulo: "Error al generar el reporte", url: null });
    expect(error.mensaje).toMatch(/proyectoId inválido/);
  });

  it("count refleja las no leídas; PUT read marca leida y fechaLectura; un usuario no toca las de otro", async () => {
    const antes = await noLeidas(admin);
    const creada = (await NotificacionService.crear(SEMILLA.adminId, { titulo: "Aviso de prueba", mensaje: "Hola" }))!;
    expect(creada).toMatchObject({ usuarioId: SEMILLA.adminId, tipo: "sistema", leida: false });
    expect(await noLeidas(admin)).toBe(antes + 1);
    expect((await lista(admin, "?unread=1")).map((n) => n.id)).toContain(creada.id);
    // El front pide `/notifications/` (con barra final)
    const conBarra = await admin.get("/notifications/");
    expect(conBarra.status).toBe(200);
    expect(conBarra.body.map((n: any) => n.id)).toContain(creada.id);

    // El operador no puede marcarla (404) ni la cuenta
    const ajena = await operador.put(`/notifications/${creada.id}/read`);
    expect(ajena.status).toBe(404);
    expect(await noLeidas(admin)).toBe(antes + 1);

    const leida = await admin.put(`/notifications/${creada.id}/read`);
    expect(leida.status).toBe(200);
    expect(leida.body).toMatchObject({ id: creada.id, leida: true });
    expect(new Date(leida.body.fechaLectura).getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(await noLeidas(admin)).toBe(antes);
    expect((await lista(admin, "?unread=1")).map((n) => n.id)).not.toContain(creada.id);

    // Marcarla otra vez no cambia la fecha de lectura
    const otraVez = await admin.put(`/notifications/${creada.id}/read`);
    expect(otraVez.body.fechaLectura).toBe(leida.body.fechaLectura);
    expect((await admin.put("/notifications/999999/read")).status).toBe(404);
  });

  it("la fecha que pone MariaDB se lee como el instante real, aunque Node no esté en UTC (M38)", async () => {
    const creada = (await NotificacionService.crear(SEMILLA.adminId, { titulo: "Reloj" }))!;
    const [leida] = (await lista(admin, "?unread=1")).filter((n) => n.id === creada.id);
    expect(Math.abs(new Date(leida.fecha).getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("marcar como leídas no dispara el suscriptor de auditoría (repo.update pasa un objeto plano)", async () => {
    const errores = jest.spyOn(logger, "error");
    try {
      const creada = (await NotificacionService.crear(SEMILLA.adminId, { titulo: "Sin auditoría" }))!;
      await NotificacionService.crear(SEMILLA.adminId, { titulo: "Sin auditoría 2" });
      expect((await admin.put(`/notifications/${creada.id}/read`)).status).toBe(200);
      expect((await admin.put("/notifications/read-all")).status).toBe(200);
      await new Promise((r) => setTimeout(r, 300)); // el suscriptor escribe sin esperar (void)
      const delSuscriptor = errores.mock.calls.filter(([m]) => String(m).includes("suscriptor de auditoría"));
      expect(delSuscriptor).toEqual([]);
    } finally {
      errores.mockRestore();
    }
  });

  it("read-all marca solo las del usuario", async () => {
    await NotificacionService.crear(SEMILLA.adminId, { titulo: "Uno" });
    await NotificacionService.crear(SEMILLA.adminId, { titulo: "Dos" });
    const delOperador = (await NotificacionService.crear(SEMILLA.operadorId, { titulo: "Del operador" }))!;
    const res = await admin.put("/notifications/read-all");
    expect(res.status).toBe(200);
    expect(res.body.actualizadas).toBeGreaterThanOrEqual(2);
    expect(await noLeidas(admin)).toBe(0);
    expect((await lista(operador, "?unread=1")).map((n) => n.id)).toContain(delOperador.id);
  });

  it("GET /notifications/stream entrega por SSE las notificaciones nuevas del usuario (y solo las suyas)", async () => {
    const servidor = app.listen(0);
    const { port } = servidor.address() as AddressInfo;
    try {
      // Sin token: 401
      const sinToken = await new Promise<number>((resolve) =>
        http.get({ port, path: "/notifications/stream" }, (r) => {
          r.resume();
          resolve(r.statusCode ?? 0);
        })
      );
      expect(sinToken).toBe(401);

      let recibido = "";
      const peticion = http.get({ port, path: `/notifications/stream?auth=${tokenOperador()}` });
      const respuesta = await new Promise<http.IncomingMessage>((resolve) => peticion.on("response", resolve));
      expect(respuesta.statusCode).toBe(200);
      expect(respuesta.headers["content-type"]).toMatch(/text\/event-stream/);
      respuesta.setEncoding("utf8");
      respuesta.on("data", (trozo: string) => (recibido += trozo));

      await esperarHasta(async () => recibido, (r) => r.includes("event: conteo"));
      await NotificacionService.crear(SEMILLA.adminId, { titulo: "Para el administrador" });
      await NotificacionService.crear(SEMILLA.operadorId, { titulo: "Para el operador por SSE" });
      await esperarHasta(async () => recibido, (r) => r.includes("Para el operador por SSE"));
      peticion.destroy();

      expect(recibido).toMatch(/^retry: 10000\n\n/);
      expect(recibido).toMatch(/event: notificacion\ndata: \{.*"titulo":"Para el operador por SSE"/);
      expect(recibido).not.toContain("Para el administrador");
    } finally {
      servidor.close();
    }
  });

  it("avisa una sola vez de los préstamos vencidos con saldo abierto, a los usuarios de la operación", async () => {
    const grupoAlta = (await crearGrupoDetalle(admin, 14)).id;
    const grupoPrestamo = (await crearGrupoDetalle(admin, 3)).id;
    const grupoDevolucion = (await crearGrupoDetalle(admin, 4)).id;
    const prestar = async () => {
      const { codigo } = await crearArticulo(admin, { grupoId: grupoAlta, cantidad: 2, movimientoTipoId: 14 });
      const prestamo = await registrarOperacion(admin, {
        codigo, cantidad: 2, movimientoTipoId: 3, grupoId: grupoPrestamo, usuariosIds: [SEMILLA.operadorId],
      });
      expect(prestamo.status).toBe(200);
      return { codigo, id: prestamo.body.id as number };
    };
    const vencido = await prestar();
    const devuelto = await prestar();
    const legado = await prestar();
    const reciente = await prestar();
    expect((await registrarOperacion(admin, { codigo: devuelto.codigo, cantidad: 2, movimientoTipoId: 4, grupoId: grupoDevolucion })).status).toBe(200);
    const antiguos = [vencido.id, devuelto.id, legado.id];
    await AppDataSource.query("UPDATE movimiento SET fecha = DATE_SUB(NOW(), INTERVAL 200 DAY) WHERE id IN (?)", [antiguos]);
    await AppDataSource.query("UPDATE movimiento SET legado = 1 WHERE id = ?", [legado.id]);

    const deMovimiento = async (id: number) =>
      AppDataSource.query("SELECT usuarioId, titulo, mensaje, url, tipo FROM notificacion WHERE clave = ?", [`prestamo-vencido:${id}`]);

    expect(await NotificacionService.avisarPrestamosVencidos(120)).toBeGreaterThanOrEqual(1);
    const avisos = await deMovimiento(vencido.id);
    expect(avisos).toEqual([
      expect.objectContaining({ usuarioId: SEMILLA.operadorId, titulo: "Préstamo vencido", tipo: "prestamo", url: `/prestamos/operacion?uid=${grupoPrestamo}` }),
    ]);
    expect(avisos[0].mensaje).toMatch(/2 piezas pendientes/);
    for (const id of [devuelto.id, legado.id, reciente.id]) expect(await deMovimiento(id)).toEqual([]);

    // Segunda pasada: no repite
    await NotificacionService.avisarPrestamosVencidos(120);
    expect(await deMovimiento(vencido.id)).toHaveLength(1);
    // La ve el operador en su lista
    expect((await lista(operador)).some((n) => n.titulo === "Préstamo vencido" && n.url === `/prestamos/operacion?uid=${grupoPrestamo}`)).toBe(true);
  });

  it("retención: borra las leídas de más de 90 días y conserva las no leídas", async () => {
    const vieja = (await NotificacionService.crear(SEMILLA.operadorId, { titulo: "Vieja leída" }))!;
    const viejaSinLeer = (await NotificacionService.crear(SEMILLA.operadorId, { titulo: "Vieja sin leer" }))!;
    await NotificacionService.marcarLeida(SEMILLA.operadorId, vieja.id);
    await AppDataSource.query("UPDATE notificacion SET fecha = DATE_SUB(NOW(), INTERVAL 100 DAY) WHERE id IN (?)", [[vieja.id, viejaSinLeer.id]]);

    expect(await NotificacionService.borrarLeidasAntiguas()).toBeGreaterThanOrEqual(1);
    const quedan = (await AppDataSource.query("SELECT id FROM notificacion WHERE id IN (?)", [[vieja.id, viejaSinLeer.id]])).map((f: any) => f.id);
    expect(quedan).toEqual([viejaSinLeer.id]);
  });
});
