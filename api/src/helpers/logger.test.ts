import { nivelDesdeEntorno, ocultarToken } from "./logger";

describe("nivelDesdeEntorno", () => {
  it("LOG_NIVEL manda si es válido", () => {
    expect(nivelDesdeEntorno({ LOG_NIVEL: "debug", NODE_ENV: "test" })).toBe("debug");
    expect(nivelDesdeEntorno({ LOG_NIVEL: "nada", LOG_CONSOLE_VERBOSE: "error" })).toBe("error");
  });
  it("en pruebas es silent salvo que se pida otro nivel", () => {
    expect(nivelDesdeEntorno({ NODE_ENV: "test", LOG_CONSOLE_VERBOSE: "debug" })).toBe("silent");
  });
  it("deriva el nivel más detallado de LOG_CONSOLE_VERBOSE", () => {
    expect(nivelDesdeEntorno({ LOG_CONSOLE_VERBOSE: "error,warn" })).toBe("warn");
    expect(nivelDesdeEntorno({ LOG_CONSOLE_VERBOSE: "warn,info" })).toBe("info");
    expect(nivelDesdeEntorno({ LOG_CONSOLE_VERBOSE: "silly" })).toBe("debug");
    expect(nivelDesdeEntorno({})).toBe("info");
  });
});

describe("ocultarToken", () => {
  it("oculta el token de ?auth= y deja el resto de la URL", () => {
    expect(ocultarToken("/notifications/stream?auth=eyJabc.def")).toBe("/notifications/stream?auth=[oculto]");
    expect(ocultarToken("/file/1?x=1&auth=abc&y=2")).toBe("/file/1?x=1&auth=[oculto]&y=2");
    expect(ocultarToken("/groups/list-antd")).toBe("/groups/list-antd");
  });
});
