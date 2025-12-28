import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OcppService } from "./ocpp.service";
import { OcppController } from "./ocpp.controller";
import { ChargePoint } from "../entities/chargepoint.entity";
import { Transaction } from "../entities/transaction.entity";
import { Device } from "../entities/device.entity";
import { Admin } from "../entities/admin.entity";
import { AdminKey } from "../entities/adminkey.entity";
import { AuthService } from "../auth/auth.service";
import { AuthController } from "../auth/auth.controller";
import { AuthKeysController } from "../auth/auth.keys.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChargePoint,
      Transaction,
      Device,
      Admin,
      AdminKey,
    ]),
  ],
  providers: [OcppService, AuthService],
  controllers: [OcppController, AuthController, AuthKeysController],
})
export class OcppModule {}
