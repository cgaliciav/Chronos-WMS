import { ColaEnSerie } from "./colaEnSerie";

const diferido = () => {
  let resolver!: () => void;
  const promesa = new Promise<void>((r) => (resolver = r));
  return { promesa, resolver };
};
const ciclo = () => new Promise((r) => setImmediate(r));

describe("ColaEnSerie", () => {
  it("ejecuta de uno en uno, en orden, e informa cuántos hay por delante", async () => {
    const cola = new ColaEnSerie();
    const eventos: string[] = [];
    const a = diferido();
    const b = diferido();
    const trabajo = (nombre: string, espera: Promise<void>) => async () => {
      eventos.push(`inicia ${nombre}`);
      await espera;
      eventos.push(`termina ${nombre}`);
    };
    expect(cola.encolar(trabajo("a", a.promesa))).toBe(0);
    expect(cola.encolar(trabajo("b", b.promesa))).toBe(1);
    expect(cola.encolar(trabajo("c", Promise.resolve()))).toBe(2);
    await ciclo();
    expect(eventos).toEqual(["inicia a"]); // b y c esperan
    a.resolver();
    await ciclo();
    expect(eventos).toEqual(["inicia a", "termina a", "inicia b"]);
    expect(cola.porDelante).toBe(2);
    b.resolver();
    await ciclo();
    await ciclo();
    expect(eventos).toEqual(["inicia a", "termina a", "inicia b", "termina b", "inicia c", "termina c"]);
    expect(cola.porDelante).toBe(0);
  });

  it("un trabajo que falla no detiene la cola", async () => {
    const errores: unknown[] = [];
    const cola = new ColaEnSerie((error) => errores.push(error));
    const hechos: string[] = [];
    cola.encolar(async () => {
      throw new Error("falló");
    });
    cola.encolar(async () => void hechos.push("segundo"));
    await ciclo();
    await ciclo();
    expect(hechos).toEqual(["segundo"]);
    expect(errores).toHaveLength(1);
    // la cola vuelve a arrancar sola tras vaciarse
    expect(cola.encolar(async () => void hechos.push("tercero"))).toBe(0);
    await ciclo();
    expect(hechos).toEqual(["segundo", "tercero"]);
  });
});
