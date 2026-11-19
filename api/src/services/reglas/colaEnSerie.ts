/**
 * Cola en serie: ejecuta los trabajos de uno en uno, en orden de llegada. La usa la generación de reportes
 * (decisión 27) para que varios reportes largos no compitan por memoria y CPU.
 * Un trabajo que falla no detiene la cola: su error llega a `alFallar` y se sigue con el siguiente.
 */
export class ColaEnSerie {
  private pendientes: (() => Promise<void>)[] = [];
  private activo = false;

  constructor(private readonly alFallar: (error: unknown) => void = () => undefined) {}

  /** Trabajos que hay por delante de uno que se encolara ahora (el que está en curso cuenta). */
  get porDelante() {
    return this.pendientes.length + (this.activo ? 1 : 0);
  }

  /** Encola el trabajo y devuelve cuántos tenía por delante (0 = empieza de inmediato). */
  encolar(trabajo: () => Promise<void>): number {
    const porDelante = this.porDelante;
    this.pendientes.push(trabajo);
    if (!this.activo) void this.atender();
    return porDelante;
  }

  private async atender() {
    this.activo = true;
    for (let trabajo = this.pendientes.shift(); trabajo; trabajo = this.pendientes.shift()) {
      try {
        await trabajo();
      } catch (error) {
        this.alFallar(error);
      }
    }
    this.activo = false;
  }
}
