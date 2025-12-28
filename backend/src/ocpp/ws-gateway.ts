import WebSocket, { Server as WebSocketServer } from "ws";
import { OcppService } from "./ocpp.service";
import { handleIncoming } from "./ocpp-protocol";

type Conn = { ws: WebSocket; identity?: string };

export let gatewayInstance: WSGateway | null = null;

export class WSGateway {
  private port: number;
  private wss: WebSocketServer | null = null;
  private conns = new Map<string, WebSocket>();

  constructor(private readonly ocppService: OcppService, port?: number) {
    this.port = port || +(process.env.WS_PORT || 8080);
    gatewayInstance = this;
  }

  start() {
    this.wss = new WebSocketServer({ port: this.port });
    this.wss.on("connection", (ws, req) => {
      let identity: string;
      ws.on("message", async (data) => {
        const raw = String(data);

        // try new OCPP array-style messages first
        try {
          await handleIncoming(raw, ws, this.ocppService);
        } catch (e) {
          // ignore protocol handler errors
        }

        // legacy plain-json messages
        try {
          const msg = JSON.parse(raw);
          if (msg && typeof msg === "object") {
            if (msg.type === "register" && msg.identity) {
              // validate token against DB-stored credentials
              const token = msg.token;
              const valid = await this.ocppService.validateDeviceToken(
                msg.identity,
                token
              );
              if (!valid) {
                ws.send(
                  JSON.stringify({ type: "error", message: "invalid token" })
                );
                ws.close(4003, "invalid token");
                return;
              }
              identity = msg.identity;
              this.conns.set(identity, ws);
              await this.ocppService.register(identity);
              ws.send(JSON.stringify({ type: "registered", identity }));
              return;
            }
            if (msg.type === "status") {
              const identity = msg.identity;
              const status = msg.status;
              if (typeof identity === "string" && typeof status === "string") {
                await this.ocppService.updateStatusFromDevice(
                  identity!,
                  status!
                );
                return;
              }
            }
          }
        } catch (e) {
          // ignore
        }
      });
      ws.on("close", () => {
        if (identity) this.conns.delete(identity);
      });
    });
    console.log(
      `WebSocket OCPP gateway listening on ws://0.0.0.0:${this.port}`
    );
  }

  sendToIdentity(identity: string, payload: any) {
    const ws = this.conns.get(identity);
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(payload));
    return true;
  }
}
