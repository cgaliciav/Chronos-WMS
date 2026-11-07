import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Archivo {

    sesionId:number;

    @PrimaryGeneratedColumn ()
    id: number;

    @Column ({ type:"mediumblob"})
    data: any;

    @Index()
    @Column({type:'varchar' , length:255 , nullable:true})
    nombre:string;

    @Column({type:"varchar" , length:127 })
    tipoMIME:string;

    @Column({type:"varchar" , length:127 })
    tipo:string;  // P.E. "NOTA DE BAJA", "FACTURA", "LICENCIA", "PASAPORTE", etc

    @Column({type:"int", default: '1'})
    orden:number;

    @Column({default:""})
    nota:string;

}