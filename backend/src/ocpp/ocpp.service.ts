import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChargePoint } from "../entities/chargepoint.entity";
import { Transaction } from "../entities/transaction.entity";
import { Device } from "../entities/device.entity";
import * as bcrypt from "bcryptjs";

type PersistedTx = { id: number };

@Injectable()
export class OcppService {
  constructor(
    @InjectRepository(ChargePoint)
    private cpRepo: Repository<ChargePoint>,
    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
    @InjectRepository(Device)
    private deviceRepo: Repository<Device>
  ) {}

  findAll() {
    return this.cpRepo.find();
  }

  async createDefaultIfEmpty() {
    const count = await this.cpRepo.count();
    if (count === 0) {
      await this.cpRepo.save([
        this.cpRepo.create({ identity: "CP_001", status: "AVAILABLE" }),
        this.cpRepo.create({ identity: "CP_002", status: "CHARGING" }),
      ]);
    }
  }

  async register(identity: string) {
    let cp = await this.cpRepo.findOneBy({ identity });
    if (!cp) {
      cp = this.cpRepo.create({ identity, status: "CONNECTED" });
      await this.cpRepo.save(cp);
    } else {
      cp.status = "CONNECTED";
      await this.cpRepo.save(cp);
    }
    return cp;
  }

  async createDevice(identity: string, token: string) {
    let d = await this.deviceRepo.findOneBy({ identity });
    if (d) return d;
    const hashed = await bcrypt.hash(token, 10);
    d = this.deviceRepo.create({ identity, token: hashed });
    return this.deviceRepo.save(d);
  }

  async validateDeviceToken(identity: string, token: string) {
    if (!identity || !token) return false;
    const d = await this.deviceRepo.findOneBy({ identity });
    if (!d) return false;
    return await bcrypt.compare(token, d.token);
  }

  // In-memory transaction tracker for demo purposes
  private transactions = new Map<
    number,
    { identity: string; meterStart: number; startedAt: string }
  >();
  private nextTxId = 1;

  async sendCommand(identity: string, command: string) {
    // Try to push command to connected device via WebSocket gateway
    try {
      // dynamic import to avoid circular dependency at module load time
      // gateway may be null if no WS server started
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const gw = require("./ws-gateway").gatewayInstance;
      if (gw) {
        const sent = gw.sendToIdentity(identity, { type: "command", command });
        if (sent) return await this.cpRepo.findOneBy({ identity });
      }
    } catch (e) {
      // ignore and fall back to DB update
    }
    const cp = await this.cpRepo.findOneBy({ identity });
    if (!cp) return null;
    cp.status = command;
    await this.cpRepo.save(cp);
    return cp;
  }

  async updateStatusFromDevice(identity: string | undefined, status: string) {
    if (!identity) return null;
    const cp = await this.cpRepo.findOneBy({ identity });
    if (!cp) return null;
    cp.status = status;
    await this.cpRepo.save(cp);
    return cp;
  }

  async startTransaction(identity: string, meterStart = 0) {
    // persist transaction
    const t = this.txRepo.create({ identity, meterStart, meterStop: 0 });
    const saved = await this.txRepo.save(t);
    this.transactions.set(saved.id, {
      identity,
      meterStart,
      startedAt: new Date().toISOString(),
    });
    await this.updateStatusFromDevice(identity, "CHARGING");
    return saved.id;
  }

  async stopTransaction(transactionId: number, meterStop = 0) {
    const tx = this.transactions.get(transactionId);
    if (!tx) return null;
    this.transactions.delete(transactionId);
    const persisted = await this.txRepo.findOneBy({ id: transactionId });
    if (persisted) {
      persisted.meterStop = meterStop;
      persisted.stoppedAt = new Date();
      await this.txRepo.save(persisted);
    }
    await this.updateStatusFromDevice(tx.identity, "AVAILABLE");
    return { transactionId, meterStop };
  }
}
