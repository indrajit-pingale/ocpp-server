import { OcppService } from "./ocpp.service";
import * as bcrypt from "bcryptjs";

const createRepo = (overrides = {}) => ({
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  ...overrides,
});

describe("OcppService (unit)", () => {
  test("validateDeviceToken returns true on match (hashed)", async () => {
    const cp = createRepo();
    const tx = createRepo();
    const hashed = await bcrypt.hash("abc", 10);
    const device = createRepo({
      findOneBy: jest
        .fn()
        .mockResolvedValue({ identity: "CP_001", token: hashed }),
    });
    const svc: any = new OcppService(cp as any, tx as any, device as any);
    const ok = await svc.validateDeviceToken("CP_001", "abc");
    expect(ok).toBe(true);
  });

  test("createDevice persists device when not exists and hashes token", async () => {
    const cp = createRepo();
    const tx = createRepo();
    const savedObj: any = {};
    const device = createRepo({
      findOneBy: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockImplementation((obj) => obj),
      save: jest.fn().mockImplementation((obj) => {
        Object.assign(savedObj, obj);
        return Promise.resolve({ id: 1 });
      }),
    });
    const svc: any = new OcppService(cp as any, tx as any, device as any);
    await svc.createDevice("CP_002", "tk");
    expect(device.save).toHaveBeenCalled();
    expect(savedObj.token).not.toBe("tk");
  });

  test("startTransaction persists and returns id", async () => {
    const cp = createRepo({
      findOneBy: jest
        .fn()
        .mockResolvedValue({ identity: "CP_1", status: "AVAILABLE" }),
      save: jest.fn(),
    });
    const tx = createRepo({
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({ id: 42 }),
    });
    const device = createRepo();
    const svc: any = new OcppService(cp as any, tx as any, device as any);
    const id = await svc.startTransaction("CP_1", 100);
    expect(id).toBe(42);
  });
});
