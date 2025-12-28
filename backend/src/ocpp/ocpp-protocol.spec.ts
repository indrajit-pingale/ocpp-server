import {
  buildCallResult,
  buildCallError,
  isValidArrayMessage,
} from "./ocpp-protocol";

describe("ocpp-protocol helpers", () => {
  test("buildCallResult produces array string", () => {
    const s = buildCallResult("1", { ok: true });
    expect(typeof s).toBe("string");
    const arr = JSON.parse(s);
    expect(arr[0]).toBe(3);
    expect(arr[1]).toBe("1");
    expect(arr[2]).toEqual({ ok: true });
  });

  test("buildCallError produces callerror", () => {
    const s = buildCallError("2", "Err", "desc");
    const arr = JSON.parse(s);
    expect(arr[0]).toBe(4);
    expect(arr[1]).toBe("2");
    expect(arr[2]).toBe("Err");
  });

  test("isValidArrayMessage", () => {
    expect(isValidArrayMessage([2, "1", "BootNotification"])).toBe(true);
    expect(isValidArrayMessage("not")).toBe(false);
  });
});
