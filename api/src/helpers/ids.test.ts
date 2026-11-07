import { idOpcional, idSeguro, idsSeguros } from "./ids";

describe("idSeguro", () => {
  it("acepta enteros positivos y strings numéricos", () => {
    expect(idSeguro(5)).toBe(5);
    expect(idSeguro("12")).toBe(12);
    expect(idSeguro(" 3 ")).toBe(3);
  });
  it.each([undefined, null, 0, -1, 1.5, "abc", "1 OR 1=1", {}, [], { id: 1 }])("rechaza %p", (v) => {
    expect(() => idSeguro(v)).toThrow(/inválido/);
  });
  it("idOpcional e idsSeguros", () => {
    expect(idOpcional(undefined)).toBeUndefined();
    expect(idOpcional("")).toBeUndefined();
    expect(idOpcional("4")).toBe(4);
    expect(idsSeguros(undefined)).toBeUndefined();
    expect(idsSeguros([1, "2"])).toEqual([1, 2]);
    expect(() => idsSeguros("1,2")).toThrow(/arreglo/);
    expect(() => idsSeguros([1, "x"])).toThrow(/ids\[1\]/);
  });
});
