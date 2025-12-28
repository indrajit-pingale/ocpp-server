import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity()
export class Device {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  identity!: string;

  @Column()
  token!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
