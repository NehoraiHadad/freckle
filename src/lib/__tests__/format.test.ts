import { describe, it, expect } from "vitest";
import { toTitleCase, formatDate, formatDateShort } from "../format";

describe("toTitleCase", () => {
  it("converts snake_case", () => {
    expect(toTitleCase("hello_world")).toBe("Hello World");
  });

  it("converts kebab-case", () => {
    expect(toTitleCase("hello-world")).toBe("Hello World");
  });

  it("converts camelCase", () => {
    expect(toTitleCase("helloWorld")).toBe("Hello World");
  });

  it("converts PascalCase", () => {
    expect(toTitleCase("HelloWorld")).toBe("Hello World");
  });

  it("handles single word", () => {
    expect(toTitleCase("hello")).toBe("Hello");
  });

  it("handles empty string", () => {
    expect(toTitleCase("")).toBe("");
  });

  it("handles mixed separators", () => {
    expect(toTitleCase("api_standard-version")).toBe("Api Standard Version");
  });

  it("handles consecutive uppercase (acronyms)", () => {
    // "apiURL" → replace camelCase → "api U R L" → capitalize → "Api U R L"
    expect(toTitleCase("apiURL")).toBe("Api U R L");
  });
});

describe("formatDate", () => {
  it("formats ISO date string with month, day, year and time", () => {
    const result = formatDate("2024-01-15T10:30:00Z");
    expect(result).toContain("2024");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });

  it("includes time components", () => {
    const result = formatDate("2024-01-15T10:30:00Z");
    // formatDate includes hour and minute
    expect(result).toContain(":");
  });

  it("accepts locale parameter", () => {
    const result = formatDate("2024-01-15T10:30:00Z", "he-IL");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("returns a string for invalid dates", () => {
    // Node.js toLocaleDateString doesn't throw for invalid dates,
    // it returns "Invalid Date"
    const result = formatDate("not-a-date");
    expect(typeof result).toBe("string");
  });

  it("defaults to en-US locale", () => {
    const result = formatDate("2024-06-15T10:30:00Z");
    expect(result).toContain("Jun");
  });
});

describe("formatDateShort", () => {
  it("formats date without time", () => {
    const result = formatDateShort("2024-01-15T10:30:00Z");
    expect(result).toContain("2024");
    expect(result).toContain("Jan");
    expect(result).toContain("15");
    // Should not contain time separator
    expect(result).not.toContain(":");
  });

  it("returns a string for invalid dates", () => {
    const result = formatDateShort("invalid");
    expect(typeof result).toBe("string");
  });

  it("accepts locale parameter", () => {
    const result = formatDateShort("2024-06-15T10:30:00Z", "he-IL");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});
