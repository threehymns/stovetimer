import { expect, test, describe } from "bun:test";
import { parseSchedule } from "../src/parser/schedule";

describe("Schedule Shorthand Parser", () => {
  test("should pass through standard systemd expressions", () => {
    expect(parseSchedule("hourly")).toBe("hourly");
    expect(parseSchedule("*-*-* 12:00:00")).toBe("*-*-* 12:00:00");
  });

  test("should correctly format minute shorthands", () => {
    expect(parseSchedule("12min")).toBe("*:0/12");
    expect(parseSchedule("every 15 minutes")).toBe("*:0/15");
    expect(parseSchedule("5 min")).toBe("*:0/5");
  });

  test("should correctly format hour shorthands", () => {
    expect(parseSchedule("2h")).toBe("0/2:00:00");
    expect(parseSchedule("every 4 hours")).toBe("0/4:00:00");
  });

  test("should accurately handle specific clock times", () => {
    expect(parseSchedule("3:30pm")).toBe("*-*-* 15:30:00");
    expect(parseSchedule("at 12:00am")).toBe("*-*-* 00:00:00");
  });
});
