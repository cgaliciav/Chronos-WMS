import { aNumero, numericTransformer } from "./numericTransformer";

describe("numericTransformer", () => {
  it("from: convierte el string del driver a número", () => {
    expect(numericTransformer.from("5.0000")).toBe(5);
    expect(numericTransformer.from("0.2500")).toBe(0.25);
    expect(numericTransformer.from(3)).toBe(3);
    expect(numericTransformer.from(null)).toBeNull();
    expect(numericTransformer.from(undefined)).toBeUndefined();
  });
  it("to: acepta números y strings numéricos, rechaza basura", () => {
    expect(numericTransformer.to(5)).toBe(5);
    expect(numericTransformer.to("7.5")).toBe(7.5);
    expect(numericTransformer.to(null)).toBeNull();
    expect(() => numericTransformer.to("abc")).toThrow(TypeError);
  });
  it("evita la concatenación que producía 5.0001", () => {
    const cantidadAlmacen = numericTransformer.from("5.0000") as number;
    expect(cantidadAlmacen + 5).toBe(10);
    expect(cantidadAlmacen === 0).toBe(false);
    expect((numericTransformer.from("0.0000") as number) === 0).toBe(true);
  });
  it("aNumero", () => {
    expect(aNumero("3")).toBe(3);
    expect(aNumero(undefined)).toBe(0);
    expect(aNumero("x", -1)).toBe(-1);
  });
});
