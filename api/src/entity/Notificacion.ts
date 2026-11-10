import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Usuario } from "./Usuario";

/** Tipos de notificación. `reporte`: un Excel terminó (o falló); `prestamo`: préstamo vencido; `sistema`: avisos. */
export const TIPOS_NOTIFICACION = ["reporte", "prestamo", "sistema"] as const;
export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

/**
 * Notificación para un usuario (plan 02 · fase 7; sustituye a MagicBell). La crea `NotificacionService` y la lee el
 * front con `NotificacionesCampana` (`GET /notifications`). No lleva `sesionId`: la crea el sistema, no una sesión, y
 * el suscriptor de auditoría la omite.
 */
@Entity()
@Index(["usuarioId", "leida", "id"])
@Index(["usuarioId", "clave"], { unique: true })
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "usuarioId" })
  usuario: Usuario;

  @Column()
  usuarioId: number;

  @Column({ length: 150 })
  titulo: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  mensaje: string | null;

  @Column({ type: "enum", enum: TIPOS_NOTIFICACION, default: "sistema" })
  tipo: TipoNotificacion;

  /**
   * Adónde lleva: una ruta del front (`/prestamos/operacion?uid=3`) o un recurso del API (`/file/report/x.xlsx`,
   * que el front abre con el token). El front ya consumía `url` (plan 01, D14); el plan lo llamaba `enlace`.
   */
  @Column({ type: "varchar", length: 255, nullable: true })
  url: string | null;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn()
  fecha: Date;

  @Column({ type: "datetime", precision: 6, nullable: true })
  fechaLectura: Date | null;

  /**
   * Evita repetir un aviso (p. ej. `prestamo-vencido:123`): único por usuario. `null` en las notificaciones que
   * pueden repetirse (MariaDB admite varios `NULL` en un índice único).
   */
  @Column({ type: "varchar", length: 100, nullable: true, select: false })
  clave: string | null;
}
