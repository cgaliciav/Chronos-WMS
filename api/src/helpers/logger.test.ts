import { nivelDesdeEntorno } from "./logger";

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
