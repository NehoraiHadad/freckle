import { describe, it, expect } from "vitest";
import { isDateField, BADGE_FIELDS, HIDDEN_FIELDS, DATE_FIELDS } from "../entity-fields";

describe("isDateField", () => {
  it("matches fields in the explicit DATE_FIELDS set", () => {
    expect(isDateField("createdAt", "anything")).toBe(true);
    expect(isDateField("updatedAt", 123)).toBe(true);
    expect(isDateField("timestamp", null)).toBe(true);
    expect(isDateField("expiresAt", undefined)).toBe(true);
  });

  it("matches pattern-based fields with ISO date values", () => {
    expect(isDateField("publishedAt", "2024-01-01T00:00:00Z")).toBe(true);
    expect(isDateField("createdDate", "2024-01-01T10:30:00Z")).toBe(true);
    expect(isDateField("eventTime", "2024-06-15T12:00:00.000Z")).toBe(true);
    expect(isDateField("lastTimestamp", "2024-12-31T23:59:59Z")).toBe(true);
  });

  it("rejects pattern-based fields with non-ISO values", () => {
    // Pattern match requires ISO date format in the value
    expect(isDateField("publishedAt", "not-a-date")).toBe(false);
    expect(isDateField("createdDate", "January 1, 2024")).toBe(false);
  });

  it("rejects non-date field names", () => {
    expect(isDateField("name", "2024-01-01T00:00:00Z")).toBe(false);
    expect(isDateField("email", "test@test.com")).toBe(false);
    expect(isDateField("count", "100")).toBe(false);
  });

  it("rejects non-string values for pattern-based matching", () => {
    // Fields not in DATE_FIELDS set require string values for pattern check
    expect(isDateField("publishedAt", 12345)).toBe(false);
    expect(isDateField("someDate", null)).toBe(false);
    expect(isDateField("someDate", undefined)).toBe(false);
  });
});

describe("BADGE_FIELDS", () => {
  it("is a Set", () => {
    expect(BADGE_FIELDS).toBeInstanceOf(Set);
  });

  it("contains expected fields", () => {
    expect(BADGE_FIELDS.has("status")).toBe(true);
    expect(BADGE_FIELDS.has("type")).toBe(true);
    expect(BADGE_FIELDS.has("role")).toBe(true);
    expect(BADGE_FIELDS.has("tier")).toBe(true);
    expect(BADGE_FIELDS.has("plan")).toBe(true);
    expect(BADGE_FIELDS.has("operationType")).toBe(true);
  });

  it("does not contain unrelated fields", () => {
    expect(BADGE_FIELDS.has("name")).toBe(false);
    expect(BADGE_FIELDS.has("email")).toBe(false);
  });
});

describe("HIDDEN_FIELDS", () => {
  it("is a Set", () => {
    expect(HIDDEN_FIELDS).toBeInstanceOf(Set);
  });

  it("contains expected fields", () => {
    expect(HIDDEN_FIELDS.has("id")).toBe(true);
    expect(HIDDEN_FIELDS.has("metadata")).toBe(true);
    expect(HIDDEN_FIELDS.has("userId")).toBe(true);
  });
});

describe("DATE_FIELDS", () => {
  it("is a Set", () => {
    expect(DATE_FIELDS).toBeInstanceOf(Set);
  });

  it("contains expected fields", () => {
    expect(DATE_FIELDS.has("createdAt")).toBe(true);
    expect(DATE_FIELDS.has("updatedAt")).toBe(true);
    expect(DATE_FIELDS.has("timestamp")).toBe(true);
  });
});
