import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class ChargePoint {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  identity!: string;

  @Column({ default: "UNKNOWN" })
  status!: string;
}
