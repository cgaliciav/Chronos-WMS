import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index, ManyToMany, JoinTable } from "typeorm";
import { Rol } from "./Rol";
import { Area } from "./Area";
import { Bodega } from "./Bodega";
import { Archivo } from "./Archivo";
import { Comentario } from "./Comentario";
import { Proyecto } from './Proyecto'
import { Sesion } from './Sesion'
import { EstatusEstado } from "./common/NombreEstatus";
import { Length, IsEmail } from "class-validator";
import * as bcrypt from "bcryptjs";

@Entity()
export class Usuario {

    sesionId:number;

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type:"varchar", length:255 })
    @Length(3,255)
    nombre: string;

    @Index({unique:true,})
    @Column({ type:"varchar", length:100 })
    @IsEmail()
    correo: string;

    @Column({ type:"varchar", length:255,  select:false, nullable: false })
    password: string;

    @Column()
    vencimiento: Date;

    @Column({type:"enum" , enum: EstatusEstado ,  default:EstatusEstado.ACTIVO})
    estatus:EstatusEstado;

    @ManyToMany(type => Rol)
    @JoinTable()
    roles:Rol[];

    @ManyToMany(type => Archivo)
    @JoinTable()
    archivo:Archivo[];

    @ManyToMany(type => Area)
    @JoinTable()
    areas:Area[];

    @ManyToMany(type => Bodega)
    @JoinTable()
    bodegas:Bodega[];

    @ManyToMany(type => Comentario)
    @JoinTable()
    comentarios:Comentario[];

    @ManyToMany(type => Proyecto)
    @JoinTable()
    proyectos:Proyecto[];

    @OneToMany(type => Sesion, sesion => sesion.usuario )
    sesiones:Sesion[];

    hashPassword() {
        let salt=Number(process.env.SALT_ROUNDS ?? 10);
        //Si se pasaba directamente el 'process.env.SALT_ROUNDS' mandaba mensaje de error.
        this.password = bcrypt.hashSync(this.password,salt);
    }
    
    checkIfUnencryptedPasswordIsValid(unencryptedPassword: string) {
        return bcrypt.compareSync(unencryptedPassword, this.password);
    }

    checkIfUserExpired(){
        let ahora = new Date;
        ahora.setHours(0,0,0,0);
        let v = this.vencimiento;
        v.setHours(0,0,0,0);
        //Compara sin considerar las horas.
        return (ahora.getTime() > v.getTime());
    }

    checkIfEnabled(){
        return (this.estatus === EstatusEstado.ACTIVO)
    } 
}
