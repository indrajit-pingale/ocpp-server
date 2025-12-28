import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OcppModule } from "./ocpp/ocpp.module";
import { ChargePoint } from "./entities/chargepoint.entity";
import { Transaction } from "./entities/transaction.entity";
import { Device } from "./entities/device.entity";
import { HealthController } from "./health/health.controller";

import { Admin } from "./entities/admin.entity";
import { AdminKey } from "./entities/adminkey.entity";
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "mysql",
      host: process.env.DB_HOST || "localhost",
      port: +(process.env.DB_PORT || 3306),
      username: process.env.DB_USER || "ocpp",
      password: process.env.DB_PASSWORD || "ocpp_pass",
      database: process.env.DB_NAME || "ocpp_db",
      entities: [ChargePoint, Transaction, Device, Admin, AdminKey],
      synchronize: true,
    }),
    OcppModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
