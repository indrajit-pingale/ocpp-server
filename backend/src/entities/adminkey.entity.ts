import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity()
export class AdminKey {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  kid!: string;

  @Column()
  secret!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ default: true })
  active!: boolean;
}
