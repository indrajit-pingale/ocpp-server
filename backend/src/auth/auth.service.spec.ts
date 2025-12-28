import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuthService } from "./auth.service";
import { Admin } from "../entities/admin.entity";
import { AdminKey } from "../entities/adminkey.entity";

const createRepo = (overrides = {}) => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  ...overrides,
});

describe("AuthService", () => {
  test("rotateKey creates key and makes it active", async () => {
    const adminRepo = createRepo();
    const keyRepo = createRepo({
      create: jest.fn().mockImplementation((k) => k),
      save: jest.fn().mockImplementation((k) => Promise.resolve(k)),
      createQueryBuilder: jest
        .fn()
        .mockReturnValue({
          update: () => ({
            set: () => ({ where: () => ({ execute: jest.fn() }) }),
          }),
        }),
    });
    const svc: any = new AuthService(adminRepo as any, keyRepo as any);
    const k = await svc.rotateKey();
    expect(k.kid).toBeDefined();
  });
});
