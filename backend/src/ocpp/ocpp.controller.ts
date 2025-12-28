import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  OnModuleInit,
  Headers,
} from "@nestjs/common";
import { OcppService } from "./ocpp.service";
import { AuthService } from "../auth/auth.service";

@Controller("api")
export class OcppController implements OnModuleInit {
  constructor(
    private readonly ocpp: OcppService,
    private readonly auth: AuthService
  ) {}

  async onModuleInit() {
    await this.ocpp.createDefaultIfEmpty();
  }

  @Get("chargepoints")
  async list() {
    return this.ocpp.findAll();
  }

  @Post("chargepoints/:id/command")
  async send(@Param("id") id: string, @Body("command") command: string) {
    return this.ocpp.sendCommand(id, command);
  }

  @Post("devices")
  async createDevice(
    @Body() body: { identity: string; token: string },
    @Headers("authorization") authHeader?: string
  ) {
    // require admin JWT for provisioning
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return { error: "unauthorized" };
    const token = authHeader.split(" ")[1];
    const verified = await this.auth.verifyToken(token);
    if (!verified) return { error: "unauthorized" };
    return this.ocpp.createDevice(body.identity, body.token);
  }
}
