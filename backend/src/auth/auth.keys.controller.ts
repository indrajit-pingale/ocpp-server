import { Controller, Post, Get, Delete, Param } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("api/admin/keys")
export class AuthKeysController {
  constructor(private readonly auth: AuthService) {}

  @Post("rotate")
  async rotate() {
    return this.auth.rotateKey();
  }

  @Get()
  async list() {
    return this.auth.listKeys();
  }

  @Delete(":kid")
  async revoke(@Param("kid") kid: string) {
    const r = await this.auth.revokeKey(kid);
    if (!r) return { error: "not found" };
    return { ok: true, kid };
  }
}
