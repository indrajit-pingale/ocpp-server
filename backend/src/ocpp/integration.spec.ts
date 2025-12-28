import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OcppModule } from "./ocpp.module";
import { AppModule } from "../app.module";
import { WSGateway } from "./ws-gateway";
import WebSocket from "ws";

jest.setTimeout(30000);

describe("OCPP E2E", () => {
  let app: INestApplication;
  let gw: WSGateway;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [
            __dirname + "/../entities/*.ts",
            __dirname + "/../entities/*.js",
          ],
          synchronize: true,
        }),
        OcppModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const ocppService = app.get("OcppService");
    gw = new WSGateway(ocppService, 0);
    gw.start();
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (e) {}
  });

  test("device register, start & stop transaction", (done) => {
    // connect to gateway ephemeral port
    // @ts-ignore
    const port = (gw as any).wss.address().port;
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on("open", () => {
      // send BootNotification as OCPP CALL
      ws.send(
        JSON.stringify([
          2,
          "1",
          "BootNotification",
          { chargePointIdentity: "CP_E2E" },
        ])
      );
    });
    let step = 0;
    ws.on("message", async (data) => {
      const msg = JSON.parse(String(data));
      if (!Array.isArray(msg)) return;
      const t = msg[0];
      const callId = msg[1];
      const payload = msg[2];
      if (t === 3 && callId === "1") {
        // boot result
        // now start transaction
        ws.send(
          JSON.stringify([
            2,
            "2",
            "StartTransaction",
            { cpIdentity: "CP_E2E", connectorId: 1, meterStart: 0 },
          ])
        );
      } else if (t === 3 && callId === "2") {
        const txId = payload.transactionId;
        expect(typeof txId).toBe("number");
        // now stop transaction
        ws.send(
          JSON.stringify([
            2,
            "3",
            "StopTransaction",
            { transactionId: txId, meterStop: 10 },
          ])
        );
      } else if (t === 3 && callId === "3") {
        // finished
        ws.close();
        done();
      }
    });
    ws.on("error", (err) => done(err));
  });
});
