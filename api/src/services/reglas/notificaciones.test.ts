import { avisoVencimiento, claveVencimiento, destinatarios, diasCuarentena, eventoSse, fechaLimite, SalidaVencida } from "./notificaciones";

const salida = (extra: Partial<SalidaVencida> = {}): SalidaVencida => ({
  movimientoId: 7,
  movimientoTipoId: 3,
  saldo: "2.0000",
  fecha: new Date(2026, 0, 5),
  proyecto: "Proyecto A",
  producto: "Cámara",
  grupoId: 12,
  usuarios: "1,2",
  registradoPor: 9,
  ...extra,
});

describe("reglas de notificaciones", () => {
  it("destinatarios: los usuarios de la operación, sin repetidos", () => {
    expect(destinatarios({ usuarios: "3, 4,3", registradoPor: 9 })).toEqual([3, 4]);
  });
  it("destinatarios: sin usuarios en la operación, quien la registró; sin ninguno, nadie", () => {
    expect(destinatarios({ usuarios: null, registradoPor: 9 })).toEqual([9]);
    expect(destinatarios({ usuarios: "", registradoPor: null })).toEqual([]);
  });
  it("aviso de préstamo: título, saldo numérico, fecha y enlace al listado", () => {
    expect(avisoVencimiento(salida())).toEqual({
      titulo: "Préstamo vencido",
      mensaje: "Cámara: 2 piezas pendientes en Proyecto A desde el 05/01/2026.",
      url: "/prestamos/operacion?uid=12",
    });
  });
  it("aviso de renta externa y de una salida sin listado ni proyecto", () => {
    const aviso = avisoVencimiento(salida({ movimientoTipoId: 11, saldo: 1, grupoId: null, proyecto: null }));
    expect(aviso.titulo).toBe("Renta externa vencida");
    expect(aviso.mensaje).toContain("1 pieza pendiente en sin proyecto");
    expect(aviso.url).toBe("/renta-externa/por-proyecto");
    expect(avisoVencimiento(salida({ grupoId: null })).url).toBe("/prestamos/activos");
  });
  it("fecha límite y días de cuarentena", () => {
    expect(fechaLimite(2, new Date("2026-01-10T00:00:00Z")).toISOString()).toBe("2026-01-08T00:00:00.000Z");
    expect(diasCuarentena("30")).toBe(30);
    expect(diasCuarentena(undefined)).toBe(120);
    expect(diasCuarentena("x")).toBe(120);
  });
  it("clave de vencimiento y formato SSE", () => {
    expect(claveVencimiento(5)).toBe("prestamo-vencido:5");
    expect(eventoSse("conteo", { noLeidas: 2 })).toBe('event: conteo\ndata: {"noLeidas":2}\n\n');
  });
});
