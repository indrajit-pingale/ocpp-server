import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  identity!: string;

  @Column("bigint")
  meterStart!: number;

  @Column("bigint")
  meterStop!: number;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ nullable: true })
  stoppedAt!: Date;
}
