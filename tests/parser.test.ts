import { expect, test, describe } from "bun:test";
import { parseSchedule } from "../src/parser/schedule";

describe("Schedule Shorthand Parser", () => {
  describe("Systemd Pass-Throughs", () => {
    test("should pass through standard native expressions", () => {
      expect(parseSchedule("hourly")).toBe("hourly");
      expect(parseSchedule("daily")).toBe("daily");
      expect(parseSchedule("*-*-* 12:00:00")).toBe("*-*-* 12:00:00");
      expect(parseSchedule("Mon..Fri *-*-* 00:00:00")).toBe("Mon..Fri *-*-* 00:00:00");
    });
  });

  describe("Recurring Intervals", () => {
    test("should correctly format minute intervals", () => {
      expect(parseSchedule("12min")).toBe("*:0/12");
      expect(parseSchedule("every 15 minutes")).toBe("*:0/15");
      expect(parseSchedule("5 m")).toBe("*:0/5");
    });

    test("should correctly format hour intervals", () => {
      expect(parseSchedule("2h")).toBe("0/2:00:00");
      expect(parseSchedule("every 4 hours")).toBe("0/4:00:00");
      expect(parseSchedule("1 hr")).toBe("0/1:00:00");
    });

    test("should correctly format day intervals", () => {
      expect(parseSchedule("2d")).toBe("*-*-1/2 00:00:00");
      expect(parseSchedule("every 3 days")).toBe("*-*-1/3 00:00:00");
    });
  });

  describe("Specific Clock Times", () => {
    test("should accurately handle am/pm offsets", () => {
      expect(parseSchedule("3:30pm")).toBe("*-*-* 15:30:00");
      expect(parseSchedule("at 6:00am")).toBe("*-*-* 06:00:00");
      expect(parseSchedule("at 8am")).toBe("*-*-* 08:00:00");
      expect(parseSchedule("12:15pm")).toBe("*-*-* 12:15:00");
      expect(parseSchedule("12:00am")).toBe("*-*-* 00:00:00");
    });

    test("should accurately handle natural language time keywords", () => {
      expect(parseSchedule("at midnight")).toBe("*-*-* 00:00:00");
      expect(parseSchedule("noon")).toBe("*-*-* 12:00:00");
      expect(parseSchedule("every day at midnight")).toBe("*-*-* 00:00:00"); // "every day" reduces to dayPart = "day" which throws unless cleaned, but systemd's "daily" is covered. Wait, we should test the fallback. "every day at midnight" simplifies down, but testing "midnight" directly is safer.
    });
  });

  describe("Specific Days of the Week", () => {
    test("should map individual weekdays natively", () => {
      expect(parseSchedule("every Friday")).toBe("Fri *-*-* 00:00:00");
      expect(parseSchedule("mon")).toBe("Mon *-*-* 00:00:00");
      expect(parseSchedule("Tuesday")).toBe("Tue *-*-* 00:00:00");
    });

    test("should map weekday groups", () => {
      expect(parseSchedule("weekdays")).toBe("Mon..Fri *-*-* 00:00:00");
      expect(parseSchedule("every weekends")).toBe("Sat,Sun *-*-* 00:00:00");
    });
  });

  describe("Combined Days and Times", () => {
    test("should combine weekdays and specific times", () => {
      expect(parseSchedule("every Friday at 5pm")).toBe("Fri *-*-* 17:00:00");
      expect(parseSchedule("Monday at 8:15am")).toBe("Mon *-*-* 08:15:00");
      expect(parseSchedule("weekends at noon")).toBe("Sat,Sun *-*-* 12:00:00");
    });
  });

  describe("Specific Calendar Dates", () => {
    test("should resolve exact dates", () => {
      expect(parseSchedule("May 5th")).toBe("*-05-05 00:00:00");
      expect(parseSchedule("Dec 25")).toBe("*-12-25 00:00:00");
      expect(parseSchedule("january 1st")).toBe("*-01-01 00:00:00");
    });

    test("should combine exact dates and times", () => {
      expect(parseSchedule("May 5th at 2pm")).toBe("*-05-05 14:00:00");
      expect(parseSchedule("December 25th at 9am")).toBe("*-12-25 09:00:00");
    });
  });

  describe("Error Handling", () => {
    test("should throw an error on unrecognizable input", () => {
      expect(() => parseSchedule("whenever the server feels like it")).toThrow();
      expect(() => parseSchedule("every lightyear")).toThrow();
      expect(() => parseSchedule("Friday at 25:00pm")).toThrow();
    });
  });
});
