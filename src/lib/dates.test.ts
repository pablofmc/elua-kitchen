import { describe, expect, it } from "vitest";
import { formatDate, formatDayAndTime, formatTime } from "./dates";

describe("kitchen times", () => {
  it("read in the kitchen's zone whatever the machine's zone", () => {
    // 04:16 UTC on the 28th is 22:16 on the 27th in the kitchen.
    expect(formatTime("2026-10-28T04:16:00Z")).toBe("22:16");
    expect(formatDate("2026-10-28T04:16:00Z")).toBe("27 oct 2026");
    expect(formatDayAndTime("2026-10-28T04:16:00Z")).toBe("27 de octubre a las 22:16");
  });
});
