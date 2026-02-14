import { describe, it, expect } from "vitest";
import { safeJsonParse } from "../utils";

describe("safeJsonParse", () => {
  it("parses valid JSON objects", () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it("parses valid JSON arrays", () => {
    expect(safeJsonParse("[1,2,3]", [])).toEqual([1, 2, 3]);
  });

  it("parses nested objects", () => {
    const input = '{"a":{"b":"c"}}';
    expect(safeJsonParse(input, {})).toEqual({ a: { b: "c" } });
  });

  it("parses JSON strings", () => {
    expect(safeJsonParse('"hello"', "")).toBe("hello");
  });

  it("parses JSON numbers", () => {
    expect(safeJsonParse("42", 0)).toBe(42);
  });

  it("parses JSON booleans", () => {
    expect(safeJsonParse("true", false)).toBe(true);
  });

  it("parses JSON null", () => {
    expect(safeJsonParse("null", "default")).toBeNull();
  });

  it("returns fallback for invalid JSON", () => {
    expect(safeJsonParse("not json", [])).toEqual([]);
    expect(safeJsonParse("{invalid}", "fallback")).toBe("fallback");
  });

  it("returns fallback for non-string input (number)", () => {
    expect(safeJsonParse(123, "default")).toBe("default");
  });

  it("returns fallback for non-string input (null)", () => {
    expect(safeJsonParse(null, "default")).toBe("default");
  });

  it("returns fallback for non-string input (undefined)", () => {
    expect(safeJsonParse(undefined, "default")).toBe("default");
  });

  it("returns fallback for non-string input (object)", () => {
    expect(safeJsonParse({ a: 1 }, "default")).toBe("default");
  });

  it("returns fallback for empty string", () => {
    expect(safeJsonParse("", "default")).toBe("default");
  });
});
