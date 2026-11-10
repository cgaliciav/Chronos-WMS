/**
 * class-validator 0.14+ rechaza por defecto los objetos sin decoradores (`forbidUnknownValues: true`). Las entidades
 * validadas con CommonController.nuevo/editar no siempre tienen decoradores: se conserva el comportamiento de 0.13.
 * La validación de entrada real la hacen los esquemas zod (src/esquemas).
 */
export const OPCIONES_VALIDACION = { forbidUnknownValues: false };
