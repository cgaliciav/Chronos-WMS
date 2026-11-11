import { opcionesSentry } from "./sentry";

// Sentry queda preparado: solo se configura con SENTRY_DSN; el entorno y la etiqueta de cliente vienen de variables.
describe("opcionesSentry", () => {
  const dsn = "https://publica@example.invalid/1";

  it("devuelve null sin SENTRY_DSN", () => {
    expect(opcionesSentry({ NODE_ENV: "production" }, "2.89.0")).toBeNull();
  });

  it("usa SENTRY_ENVIRONMENT, la etiqueta cliente y el release almacen-api@versión", () => {
    const opciones = opcionesSentry({ SENTRY_DSN: dsn, SENTRY_ENVIRONMENT: "staging", CLIENTE: "amz" }, "2.89.0");
    expect(opciones).not.toBeNull();
    expect(opciones!.environment).toBe("staging");
    expect(opciones!.release).toBe("almacen-api@2.89.0");
    expect((opciones!.initialScope as { tags: Record<string, string> }).tags.cliente).toBe("amz");
  });

  it("sin SENTRY_ENVIRONMENT cae a NODE_ENV", () => {
    const opciones = opcionesSentry({ SENTRY_DSN: dsn, NODE_ENV: "production" }, "2.89.0");
    expect(opciones!.environment).toBe("production");
  });

  it("sin CLIENTE no añade la etiqueta cliente", () => {
    const opciones = opcionesSentry({ SENTRY_DSN: dsn, SENTRY_ENVIRONMENT: "produccion" }, "2.89.0");
    expect((opciones!.initialScope as { tags?: Record<string, string> } | undefined)?.tags?.cliente).toBeUndefined();
  });
});
