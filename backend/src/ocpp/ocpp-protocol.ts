import WebSocket from "ws";
import { OcppService } from "./ocpp.service";
import Ajv, { JSONSchemaType } from "ajv";
import * as fs from "fs";
import * as path from "path";

// Very small OCPP-like JSON array protocol helper
// CALL: [2, callId, action, payload]
// CALLRESULT: [3, callId, payload]
// CALLERROR: [4, callId, errorCode, errorDescription, errorDetails]

const ajv = new Ajv();

type BootPayload = {
  chargePointIdentity?: string;
  chargePointModel?: string;
  chargePointSerialNumber?: string;
};
const bootSchema: JSONSchemaType<BootPayload> = {
  type: "object",
  properties: {
    chargePointIdentity: { type: "string", nullable: true },
    chargePointModel: { type: "string", nullable: true },
    chargePointSerialNumber: { type: "string", nullable: true },
  },
  required: [],
  additionalProperties: true,
};

type StartTxPayload = { cpIdentity?: string; meterStart?: number };
const startSchema: JSONSchemaType<StartTxPayload> = {
  type: "object",
  properties: {
    cpIdentity: { type: "string", nullable: true },
    meterStart: { type: "number", nullable: true },
  },
  required: [],
  additionalProperties: true,
};

const validateBoot = ajv.compile(bootSchema);
const validateStart = ajv.compile(startSchema);

// load additional schemas from schemas/ folder when available
const schemaDir = path.join(__dirname, "schemas");
const validators: Record<string, any> = {};
try {
  const files = fs.readdirSync(schemaDir);
  for (const f of files) {
    if (f.endsWith(".json")) {
      const name = f.replace(/\.json$/, "");
      const s = JSON.parse(fs.readFileSync(path.join(schemaDir, f), "utf8"));
      validators[name.toLowerCase()] = ajv.compile(s as any);
    }
  }
} catch (e) {
  // ignore if folder missing
}

export function isValidArrayMessage(msg: any): boolean {
  return Array.isArray(msg) && msg.length >= 3;
}

export function buildCallResult(callId: string | number, payload: any) {
  return JSON.stringify([3, callId, payload]);
}

export function buildCallError(
  callId: string | number,
  errorCode: string,
  errorDescription = "",
  details: any = null
) {
  return JSON.stringify([4, callId, errorCode, errorDescription, details]);
}

export async function handleIncoming(
  raw: string,
  ws: WebSocket,
  ocppService: OcppService
) {
  let msg: any;
  try {
    msg = JSON.parse(raw);
  } catch (e) {
    return; // ignore non-json
  }

  if (!isValidArrayMessage(msg)) return;

  const msgType = msg[0];
  const callId = msg[1];
  const action = msg[2];
  const payload = msg[3] || {};

  // Only handle CALL messages (2)
  if (msgType !== 2) return;

  try {
    switch (action) {
      case "BootNotification": {
        if (!validateBoot(payload)) {
          ws.send(
            buildCallError(
              callId,
              "ProtocolError",
              "Invalid BootNotification payload",
              validateBoot.errors
            )
          );
          return;
        }
        const identity =
          payload?.chargePointModel ||
          payload?.chargePointSerialNumber ||
          payload?.chargePointIdentity ||
          "unknown";
        await ocppService.register(identity);
        const res = { status: "Accepted", interval: 300 };
        ws.send(buildCallResult(callId, res));
        break;
      }
      case "Heartbeat": {
        const now = new Date().toISOString();
        ws.send(buildCallResult(callId, { currentTime: now }));
        break;
      }
      case "StartTransaction": {
        const v = validators["starttransaction"] || validateStart;
        if (!v(payload)) {
          ws.send(
            buildCallError(
              callId,
              "ProtocolError",
              "Invalid StartTransaction payload",
              v.errors
            )
          );
          return;
        }
        const identity =
          payload.cpIdentity || payload.chargePointIdentity || "unknown";
        const tx = await ocppService.startTransaction(
          identity,
          payload.meterStart || 0
        );
        ws.send(buildCallResult(callId, { transactionId: tx }));
        break;
      }
      case "StopTransaction": {
        const v = validators["stoptransaction"] || null;
        if (v && !v(payload)) {
          ws.send(
            buildCallError(
              callId,
              "ProtocolError",
              "Invalid StopTransaction payload",
              v.errors
            )
          );
          return;
        }
        const txId = payload.transactionId;
        if (typeof txId !== "number") {
          ws.send(
            buildCallError(
              callId,
              "ProtocolError",
              "Invalid StopTransaction payload",
              null
            )
          );
          return;
        }
        await ocppService.stopTransaction(txId, payload.meterStop || 0);
        ws.send(buildCallResult(callId, {}));
        break;
      }
      case "StatusNotification": {
        const v = validators["statusnotification"] || null;
        if (v && !v(payload)) {
          ws.send(
            buildCallError(
              callId,
              "ProtocolError",
              "Invalid StatusNotification payload",
              v.errors
            )
          );
          return;
        }
        const identity =
          payload?.chargePointIdentity ||
          payload?.cpIdentity ||
          payload?.cpIdentity ||
          "unknown";
        const status = payload.status || payload.connectorStatus || "UNKNOWN";
        await ocppService.updateStatusFromDevice(identity, status);
        ws.send(buildCallResult(callId, {}));
        break;
      }
      case "Authorize": {
        // minimal Authorize response
        const idTag = payload.idTag || payload.idTagValue || "unknown";
        const idTagInfo = { status: "Accepted", expiryDate: null };
        ws.send(buildCallResult(callId, { idTagInfo }));
        break;
      }
      case "RemoteStartTransaction": {
        // request a start from server side; attempt to send command to device
        const cpIdentity = payload?.cpIdentity || payload?.chargePointIdentity;
        if (cpIdentity) {
          await ocppService.sendCommand(cpIdentity, "CHARGING");
          ws.send(buildCallResult(callId, { status: "Accepted" }));
        } else {
          ws.send(
            buildCallError(
              callId,
              "ProtocolError",
              "Missing charge point identity"
            )
          );
        }
        break;
      }
      case "RemoteStopTransaction": {
        const txId = payload.transactionId;
        if (typeof txId === "number") {
          await ocppService.stopTransaction(txId, payload.meterStop || 0);
          ws.send(buildCallResult(callId, { status: "Accepted" }));
        } else {
          ws.send(
            buildCallError(callId, "ProtocolError", "Invalid transactionId")
          );
        }
        break;
      }
      default: {
        ws.send(
          buildCallError(
            callId,
            "NotSupported",
            `Action ${action} not implemented`
          )
        );
        break;
      }
    }
  } catch (e) {
    try {
      ws.send(buildCallError(callId, "InternalError", "Handler error"));
    } catch (_) {}
  }
}
