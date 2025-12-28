import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("api/admin")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(@Body() body: { username: string; password: string }) {
    return this.auth.createAdmin(body.username, body.password);
  }

  @Post("login")
  async login(@Body() body: { username: string; password: string }) {
    const ok = await this.auth.validateAdmin(body.username, body.password);
    console.log("Login attempt:", body.username, "Success:", ok);
    if (!ok) return { error: "invalid credentials" };
    const token = await this.auth.signToken({ username: body.username });
    return { token };
  }

  @Post("request-password-reset")
  async requestReset(@Body() body: { username: string }) {
    const token = await this.auth.requestPasswordReset(body.username);
    if (!token) return { error: "unknown user" };
    return { resetToken: token };
  }

  @Post("reset-password")
  async reset(
    @Body() body: { username: string; token: string; newPassword: string }
  ) {
    const ok = await this.auth.resetPassword(
      body.username,
      body.token,
      body.newPassword
    );
    return { ok };
  }
}
