import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Admin } from "../entities/admin.entity";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { AdminKey } from "../entities/adminkey.entity";
import * as nodemailer from "nodemailer";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(AdminKey) private keyRepo: Repository<AdminKey>
  ) {}

  async createAdmin(username: string, password: string) {
    const exists = await this.adminRepo.findOneBy({ username });
    if (exists) return exists;
    const hash = await bcrypt.hash(password, 10);
    const a = this.adminRepo.create({ username, passwordHash: hash } as any);
    return this.adminRepo.save(a);
  }

  async validateAdmin(username: string, password: string) {
    const admin = await this.adminRepo.findOneBy({ username });
    if (!admin) return false;
    try {
      return await bcrypt.compare(password, admin.passwordHash);
    } catch (e) {
      return false;
    }
  }

  async signToken(payload: object) {
    const secretEnv = process.env.JWT_SECRET;
    if (secretEnv) return jwt.sign(payload, secretEnv, { expiresIn: "12h" });
    // fallback to DB-stored key
    const key = await this.keyRepo.findOne({
      where: { active: true },
      order: { createdAt: "DESC" },
    });
    const k = (key as any) || null;
    if (!k) {
      const secret = "change_me";
      return jwt.sign(payload, secret, { expiresIn: "12h" });
    }
    return jwt.sign(payload, k.secret, {
      expiresIn: "12h",
      header: { kid: k.kid, alg: "HS256" },
    });
  }

  async verifyToken(token: string) {
    try {
      const decodedHeader: any = jwt.decode(token, { complete: true })?.header;
      const kid = decodedHeader?.kid;
      if (process.env.JWT_SECRET && !kid) {
        return jwt.verify(token, process.env.JWT_SECRET || "change_me");
      }
      if (kid) {
        const k = await this.keyRepo.findOneBy({ kid });
        if (k) return jwt.verify(token, (k as any).secret);
      }
      const keys = await this.keyRepo.find();
      for (const key of keys || []) {
        try {
          return jwt.verify(token, (key as any).secret);
        } catch (_) {}
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async rotateKey() {
    const kid = uuidv4();
    const secret = uuidv4();
    // deactivate existing
    await this.keyRepo
      .createQueryBuilder()
      .update(AdminKey)
      .set({ active: false })
      .where("active = :a", { a: true })
      .execute();
    const k = this.keyRepo.create({ kid, secret, active: true } as any);
    return this.keyRepo.save(k);
  }

  async listKeys() {
    return this.keyRepo.find({ order: { createdAt: "DESC" } });
  }

  async requestPasswordReset(username: string) {
    const admin = await this.adminRepo.findOneBy({ username });
    if (!admin) return null;
    const token = uuidv4();
    admin.resetToken = token;
    admin.resetExpiry = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await this.adminRepo.save(admin);
    // send email if SMTP configured
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: !!process.env.SMTP_SECURE,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/reset-password?username=${encodeURIComponent(username)}&token=${token}`;
      const mail = {
        from: process.env.SMTP_FROM || "no-reply@example.com",
        to: admin.email || process.env.ADMIN_CONTACT_EMAIL || username,
        subject: "Password reset",
        text: `Use this link to reset your password: ${resetUrl}`,
        html: `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      };
      try {
        await transporter.sendMail(mail);
      } catch (e) {
        // if sending fails, still return token for dev usage
        // eslint-disable-next-line no-console
        console.error("Failed to send reset email", e);
      }
    } else {
      // fallback: log token for local/dev
      // eslint-disable-next-line no-console
      console.log("Password reset token for", username, token);
    }
    return token;
  }

  async revokeKey(kid: string) {
    const k = await this.keyRepo.findOneBy({ kid });
    if (!k) return null;
    k.active = false;
    return this.keyRepo.save(k);
  }

  async resetPassword(username: string, token: string, newPassword: string) {
    const admin = await this.adminRepo.findOneBy({ username });
    if (!admin || !admin.resetToken || admin.resetToken !== token) return false;
    if (!admin.resetExpiry || admin.resetExpiry.getTime() < Date.now())
      return false;
    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    admin.resetToken = null as any;
    admin.resetExpiry = null as any;
    await this.adminRepo.save(admin);
    return true;
  }
}
