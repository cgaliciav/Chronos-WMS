import {Entity, PrimaryGeneratedColumn, Column, Index} from "typeorm";

@Entity()
export class Parametros {
    sesionId:number;
    
    @PrimaryGeneratedColumn()
    id: number;

    @Index({unique:true})
    @Column({type: "varchar" , length:60})
    llave:string;

    @Column()
    valor:string;

}