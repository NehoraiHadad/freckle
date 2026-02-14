import { describe, it, expect } from "vitest";
import { resolveSchema } from "../schema-resolver";
import type { JsonSchema } from "@/types/openapi";

describe("resolveSchema", () => {
  it("returns undefined for undefined input", () => {
    const result = resolveSchema(undefined, {});
    expect(result).toBeUndefined();
  });

  it("returns simple schema unchanged when no $ref", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    };
    const result = resolveSchema(schema, {});
    expect(result).toEqual(schema);
  });

  it("resolves a simple $ref", () => {
    const schema: JsonSchema = { $ref: "#/components/schemas/User" };
    const components: Record<string, JsonSchema> = {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.type).toBe("object");
    expect(result!.properties).toHaveProperty("id");
    expect(result!.properties).toHaveProperty("name");
    // $ref should be resolved away
    expect(result!.$ref).toBeUndefined();
  });

  it("resolves nested $ref in properties", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        user: { $ref: "#/components/schemas/User" },
        count: { type: "number" },
      },
    };
    const components: Record<string, JsonSchema> = {
      User: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.properties!.user.type).toBe("object");
    expect(result!.properties!.user.properties).toHaveProperty("name");
    expect(result!.properties!.count.type).toBe("number");
  });

  it("resolves $ref in array items", () => {
    const schema: JsonSchema = {
      type: "array",
      items: { $ref: "#/components/schemas/Item" },
    };
    const components: Record<string, JsonSchema> = {
      Item: {
        type: "object",
        properties: {
          id: { type: "string" },
          value: { type: "number" },
        },
      },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.type).toBe("array");
    expect(result!.items!.type).toBe("object");
    expect(result!.items!.properties).toHaveProperty("id");
    expect(result!.items!.properties).toHaveProperty("value");
  });

  it("resolves chained $ref (ref pointing to ref)", () => {
    const schema: JsonSchema = { $ref: "#/components/schemas/Alias" };
    const components: Record<string, JsonSchema> = {
      Alias: { $ref: "#/components/schemas/Real" },
      Real: {
        type: "object",
        properties: {
          data: { type: "string" },
        },
      },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.type).toBe("object");
    expect(result!.properties).toHaveProperty("data");
  });

  it("handles missing $ref gracefully (returns schema with $ref intact)", () => {
    const schema: JsonSchema = { $ref: "#/components/schemas/NonExistent" };
    const components: Record<string, JsonSchema> = {};
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    // When the ref target is missing, the schema is returned as-is
    expect(result!.$ref).toBe("#/components/schemas/NonExistent");
  });

  it("handles circular $ref without infinite loop", () => {
    const schema: JsonSchema = { $ref: "#/components/schemas/Node" };
    const components: Record<string, JsonSchema> = {
      Node: {
        type: "object",
        properties: {
          value: { type: "string" },
          child: { $ref: "#/components/schemas/Node" },
        },
      },
    };
    // Should not hang or throw — circular refs are handled via visited set
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.type).toBe("object");
    expect(result!.properties).toHaveProperty("value");
    // The circular child ref should be returned as-is (not resolved again)
    expect(result!.properties!.child.$ref).toBe("#/components/schemas/Node");
  });

  it("respects maxDepth parameter", () => {
    const schema: JsonSchema = { $ref: "#/components/schemas/Deep" };
    const components: Record<string, JsonSchema> = {
      Deep: {
        type: "object",
        properties: {
          nested: { $ref: "#/components/schemas/Deep2" },
        },
      },
      Deep2: {
        type: "object",
        properties: {
          value: { type: "string" },
        },
      },
    };
    // With maxDepth=1, the first ref resolves but inner refs should not fully resolve
    const result = resolveSchema(schema, components, 1);
    expect(result).toBeDefined();
    expect(result!.type).toBe("object");
  });

  it("resolves $ref in oneOf schemas", () => {
    const schema: JsonSchema = {
      oneOf: [
        { $ref: "#/components/schemas/Cat" },
        { $ref: "#/components/schemas/Dog" },
      ],
    };
    const components: Record<string, JsonSchema> = {
      Cat: { type: "object", properties: { meow: { type: "boolean" } } },
      Dog: { type: "object", properties: { bark: { type: "boolean" } } },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.oneOf).toHaveLength(2);
    expect(result!.oneOf![0].type).toBe("object");
    expect(result!.oneOf![0].properties).toHaveProperty("meow");
    expect(result!.oneOf![1].type).toBe("object");
    expect(result!.oneOf![1].properties).toHaveProperty("bark");
  });

  it("resolves $ref in anyOf schemas", () => {
    const schema: JsonSchema = {
      anyOf: [
        { $ref: "#/components/schemas/A" },
        { type: "string" },
      ],
    };
    const components: Record<string, JsonSchema> = {
      A: { type: "number", minimum: 0 },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.anyOf).toHaveLength(2);
    expect(result!.anyOf![0].type).toBe("number");
    expect(result!.anyOf![1].type).toBe("string");
  });

  it("resolves $ref in allOf schemas", () => {
    const schema: JsonSchema = {
      allOf: [
        { $ref: "#/components/schemas/Base" },
        { type: "object", properties: { extra: { type: "string" } } },
      ],
    };
    const components: Record<string, JsonSchema> = {
      Base: { type: "object", properties: { id: { type: "string" } } },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.allOf).toHaveLength(2);
    expect(result!.allOf![0].type).toBe("object");
    expect(result!.allOf![0].properties).toHaveProperty("id");
    expect(result!.allOf![1].properties).toHaveProperty("extra");
  });

  it("resolves $ref in additionalProperties", () => {
    const schema: JsonSchema = {
      type: "object",
      additionalProperties: { $ref: "#/components/schemas/Value" },
    };
    const components: Record<string, JsonSchema> = {
      Value: { type: "number", minimum: 0 },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    const addlProps = result!.additionalProperties as JsonSchema;
    expect(addlProps.type).toBe("number");
    expect(addlProps.minimum).toBe(0);
  });

  it("does not resolve additionalProperties when it is a boolean", () => {
    const schema: JsonSchema = {
      type: "object",
      additionalProperties: false,
    };
    const result = resolveSchema(schema, {});
    expect(result).toBeDefined();
    expect(result!.additionalProperties).toBe(false);
  });

  it("handles $ref with non-standard path (returns schema as-is)", () => {
    const schema: JsonSchema = { $ref: "#/definitions/Foo" };
    const components: Record<string, JsonSchema> = {};
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    // extractRefName returns null for non-standard paths, so $ref stays
    expect(result!.$ref).toBe("#/definitions/Foo");
  });

  it("preserves non-ref schema fields during resolution", () => {
    const schema: JsonSchema = {
      type: "object",
      description: "Test schema",
      properties: {
        field: { $ref: "#/components/schemas/FieldType" },
      },
      required: ["field"],
    };
    const components: Record<string, JsonSchema> = {
      FieldType: { type: "string", enum: ["a", "b", "c"] },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    expect(result!.type).toBe("object");
    expect(result!.description).toBe("Test schema");
    expect(result!.required).toEqual(["field"]);
    expect(result!.properties!.field.type).toBe("string");
    expect(result!.properties!.field.enum).toEqual(["a", "b", "c"]);
  });

  it("deeply nested resolution works", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        level1: {
          type: "object",
          properties: {
            level2: {
              type: "array",
              items: { $ref: "#/components/schemas/Leaf" },
            },
          },
        },
      },
    };
    const components: Record<string, JsonSchema> = {
      Leaf: { type: "string", format: "date-time" },
    };
    const result = resolveSchema(schema, components);
    expect(result).toBeDefined();
    const leaf = result!.properties!.level1.properties!.level2.items;
    expect(leaf).toBeDefined();
    expect(leaf!.type).toBe("string");
    expect(leaf!.format).toBe("date-time");
  });
});
