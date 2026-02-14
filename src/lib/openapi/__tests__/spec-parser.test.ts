import { describe, it, expect } from "vitest";
import { parseOpenApiSpec } from "../spec-parser";

const minimalSpec = {
  openapi: "3.1.0",
  info: { title: "Test API", version: "1.0.0" },
  paths: {
    "/api/v1/admin/users": {
      get: {
        summary: "List users",
        operationId: "listUsers",
        tags: ["Users"],
        responses: { "200": { description: "OK" } },
      },
      post: {
        summary: "Create user",
        operationId: "createUser",
        tags: ["Users"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
                required: ["name", "email"],
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/admin/users/{userId}": {
      get: {
        summary: "Get user",
        operationId: "getUser",
        tags: ["Users"],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
      patch: {
        summary: "Update user",
        operationId: "updateUser",
        tags: ["Users"],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
      delete: {
        summary: "Delete user",
        operationId: "deleteUser",
        tags: ["Users"],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/v1/admin/users/{userId}/credits": {
      get: {
        summary: "List user credits",
        operationId: "listUserCredits",
        tags: ["Credits"],
        parameters: [
          { name: "userId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/v1/admin/stats": {
      get: {
        summary: "Get stats",
        operationId: "getStats",
        tags: ["Stats"],
        responses: { "200": { description: "OK" } },
      },
    },
  },
};

const BASE_URL = "http://localhost:3000/api/v1/admin";
const PRODUCT_ID = "test-product";

describe("parseOpenApiSpec", () => {
  it("parses a minimal spec and returns correct metadata", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    expect(result.productId).toBe("test-product");
    expect(result.specVersion).toBe("3.1.0");
    expect(result.apiTitle).toBe("Test API");
    expect(result.apiVersion).toBe("1.0.0");
    expect(result.parsedAt).toBeTruthy();
  });

  it("detects admin prefix from baseUrl", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    expect(result.adminPrefix).toBe("/api/v1/admin");
  });

  it("strips trailing slash from admin prefix", () => {
    const result = parseOpenApiSpec(minimalSpec, "http://localhost:3000/api/v1/admin/", PRODUCT_ID);
    expect(result.adminPrefix).toBe("/api/v1/admin");
  });

  it("extracts top-level resources", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    expect(result.resources.length).toBeGreaterThan(0);
    const topLevelKeys = result.resources.map(r => r.key);
    expect(topLevelKeys).toContain("users");
    expect(topLevelKeys).toContain("stats");
  });

  it("creates correct resource names using toTitleCase", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const userResource = result.resources.find(r => r.key === "users");
    expect(userResource).toBeDefined();
    expect(userResource!.name).toBe("Users");
  });

  it("extracts all operations from admin paths", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    // users: GET list, POST create, GET detail, PATCH update, DELETE delete = 5
    // users.credits: GET sub-list = 1
    // stats: GET list = 1
    // Total = 7
    expect(result.allOperations.length).toBe(7);
  });

  it("generates correct operation IDs (method:stripped-path)", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const listOp = result.allOperations.find(
      op => op.httpMethod === "GET" && op.resourceKey === "users" && op.operationType === "list"
    );
    expect(listOp).toBeDefined();
    expect(listOp!.id).toBe("GET:/users");
  });

  it("classifies list operations (GET on collection)", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const listOp = result.allOperations.find(
      op => op.httpMethod === "GET" && op.pathTemplate === "/users"
    );
    expect(listOp).toBeDefined();
    expect(listOp!.operationType).toBe("list");
  });

  it("classifies create operations (POST on collection)", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const createOp = result.allOperations.find(
      op => op.httpMethod === "POST" && op.pathTemplate === "/users"
    );
    expect(createOp).toBeDefined();
    expect(createOp!.operationType).toBe("create");
  });

  it("classifies detail operations (GET on resource with ID)", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const detailOp = result.allOperations.find(
      op => op.httpMethod === "GET" && op.pathTemplate === "/users/{userId}"
    );
    expect(detailOp).toBeDefined();
    expect(detailOp!.operationType).toBe("detail");
  });

  it("classifies update operations (PATCH on resource with ID)", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const updateOp = result.allOperations.find(
      op => op.httpMethod === "PATCH" && op.pathTemplate === "/users/{userId}"
    );
    expect(updateOp).toBeDefined();
    expect(updateOp!.operationType).toBe("update");
  });

  it("classifies delete operations (DELETE on resource with ID)", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const deleteOp = result.allOperations.find(
      op => op.httpMethod === "DELETE" && op.pathTemplate === "/users/{userId}"
    );
    expect(deleteOp).toBeDefined();
    expect(deleteOp!.operationType).toBe("delete");
  });

  it("classifies sub-list operations (GET on sub-resource collection)", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const subListOp = result.allOperations.find(
      op => op.httpMethod === "GET" && op.pathTemplate === "/users/{userId}/credits"
    );
    expect(subListOp).toBeDefined();
    expect(subListOp!.operationType).toBe("sub-list");
  });

  it("generates correct resource keys from paths", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);

    // /users → "users"
    const userListOp = result.allOperations.find(op => op.pathTemplate === "/users");
    expect(userListOp!.resourceKey).toBe("users");

    // /users/{userId} → "users"
    const userDetailOp = result.allOperations.find(op => op.pathTemplate === "/users/{userId}");
    expect(userDetailOp!.resourceKey).toBe("users");

    // /users/{userId}/credits → "users.credits"
    const creditsOp = result.allOperations.find(op => op.pathTemplate === "/users/{userId}/credits");
    expect(creditsOp!.resourceKey).toBe("users.credits");

    // /stats → "stats"
    const statsOp = result.allOperations.find(op => op.pathTemplate === "/stats");
    expect(statsOp!.resourceKey).toBe("stats");
  });

  it("extracts path parameters from operation paths", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);

    const detailOp = result.allOperations.find(op => op.pathTemplate === "/users/{userId}");
    expect(detailOp!.pathParameters).toEqual(["userId"]);

    const creditsOp = result.allOperations.find(op => op.pathTemplate === "/users/{userId}/credits");
    expect(creditsOp!.pathParameters).toEqual(["userId"]);

    const listOp = result.allOperations.find(op => op.pathTemplate === "/users");
    expect(listOp!.pathParameters).toEqual([]);
  });

  it("builds resource tree with children", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const userResource = result.resources.find(r => r.key === "users");
    expect(userResource).toBeDefined();
    expect(userResource!.children.length).toBeGreaterThan(0);

    const creditsChild = userResource!.children.find(c => c.key === "users.credits");
    expect(creditsChild).toBeDefined();
    expect(creditsChild!.parentKey).toBe("users");
    expect(creditsChild!.pathSegment).toBe("credits");
  });

  it("sets requiresParentId for sub-resources that need parent ID", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);

    // users.credits requires parent ID (path: /users/{userId}/credits)
    const allResources = result.resources.flatMap(r => [r, ...r.children]);
    const creditsResource = allResources.find(r => r.key === "users.credits");
    expect(creditsResource).toBeDefined();
    expect(creditsResource!.requiresParentId).toBe(true);
  });

  it("does not set requiresParentId for top-level resources", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const userResource = result.resources.find(r => r.key === "users");
    expect(userResource).toBeDefined();
    expect(userResource!.requiresParentId).toBe(false);

    const statsResource = result.resources.find(r => r.key === "stats");
    expect(statsResource).toBeDefined();
    expect(statsResource!.requiresParentId).toBe(false);
  });

  it("resolves request body schemas", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const createOp = result.allOperations.find(
      op => op.httpMethod === "POST" && op.pathTemplate === "/users"
    );
    expect(createOp).toBeDefined();
    expect(createOp!.requestBodySchema).toBeDefined();
    expect(createOp!.requestBodySchema!.type).toBe("object");
    expect(createOp!.requestBodySchema!.properties).toHaveProperty("name");
    expect(createOp!.requestBodySchema!.properties).toHaveProperty("email");
    expect(createOp!.requestBodySchema!.required).toEqual(["name", "email"]);
  });

  it("preserves operation tags", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const listOp = result.allOperations.find(op => op.pathTemplate === "/users" && op.httpMethod === "GET");
    expect(listOp!.tags).toEqual(["Users"]);
  });

  it("preserves operation summary", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    const listOp = result.allOperations.find(op => op.pathTemplate === "/users" && op.httpMethod === "GET");
    expect(listOp!.summary).toBe("List users");
  });

  it("ignores paths outside admin prefix", () => {
    const specWithPublic = {
      ...minimalSpec,
      paths: {
        ...minimalSpec.paths,
        "/api/v1/public/health": {
          get: {
            summary: "Health check",
            responses: { "200": { description: "OK" } },
          },
        },
      },
    };
    const result = parseOpenApiSpec(specWithPublic, BASE_URL, PRODUCT_ID);
    const healthOp = result.allOperations.find(op => op.pathTemplate.includes("health"));
    expect(healthOp).toBeUndefined();
  });

  it("ignores non-HTTP-method keys in path items", () => {
    const specWithExtra = {
      ...minimalSpec,
      paths: {
        ...minimalSpec.paths,
        "/api/v1/admin/test": {
          get: {
            summary: "Test",
            responses: { "200": { description: "OK" } },
          },
          parameters: [{ name: "shared", in: "query" }],
        },
      },
    };
    const result = parseOpenApiSpec(specWithExtra, BASE_URL, PRODUCT_ID);
    // "parameters" should be ignored as it's not a valid HTTP method
    const testOps = result.allOperations.filter(op => op.pathTemplate === "/test");
    expect(testOps.length).toBe(1);
    expect(testOps[0].httpMethod).toBe("GET");
  });

  it("returns empty schemas when spec has no components", () => {
    const result = parseOpenApiSpec(minimalSpec, BASE_URL, PRODUCT_ID);
    expect(result.schemas).toEqual({});
  });

  it("resolves $ref in request body schema", () => {
    const specWithRefs = {
      openapi: "3.1.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/v1/admin/items": {
          post: {
            summary: "Create item",
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CreateItem" },
                },
              },
            },
            responses: { "201": { description: "Created" } },
          },
        },
      },
      components: {
        schemas: {
          CreateItem: {
            type: "object",
            properties: {
              title: { type: "string" },
              value: { type: "number" },
            },
            required: ["title"],
          },
        },
      },
    };
    const result = parseOpenApiSpec(specWithRefs, BASE_URL, PRODUCT_ID);
    const createOp = result.allOperations.find(op => op.httpMethod === "POST");
    expect(createOp).toBeDefined();
    expect(createOp!.requestBodySchema).toBeDefined();
    // After resolution, $ref should be replaced with actual schema
    expect(createOp!.requestBodySchema!.type).toBe("object");
    expect(createOp!.requestBodySchema!.properties).toHaveProperty("title");
  });

  it("resolves response schema from 200 response", () => {
    const specWithResponse = {
      openapi: "3.1.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/v1/admin/items": {
          get: {
            summary: "List items",
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { type: "object", properties: { id: { type: "string" } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = parseOpenApiSpec(specWithResponse, BASE_URL, PRODUCT_ID);
    const listOp = result.allOperations.find(op => op.httpMethod === "GET");
    expect(listOp).toBeDefined();
    expect(listOp!.responseSchema).toBeDefined();
    expect(listOp!.responseSchema!.type).toBe("array");
  });

  it("sorts children alphabetically", () => {
    const specWithMultiSub = {
      openapi: "3.1.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/v1/admin/users": {
          get: { summary: "List", responses: { "200": { description: "OK" } } },
        },
        "/api/v1/admin/users/{userId}/zebra": {
          get: { summary: "Zebra", responses: { "200": { description: "OK" } } },
        },
        "/api/v1/admin/users/{userId}/alpha": {
          get: { summary: "Alpha", responses: { "200": { description: "OK" } } },
        },
        "/api/v1/admin/users/{userId}/middle": {
          get: { summary: "Middle", responses: { "200": { description: "OK" } } },
        },
      },
    };
    const result = parseOpenApiSpec(specWithMultiSub, BASE_URL, PRODUCT_ID);
    const userResource = result.resources.find(r => r.key === "users");
    expect(userResource).toBeDefined();
    const childKeys = userResource!.children.map(c => c.key);
    expect(childKeys).toEqual(["users.alpha", "users.middle", "users.zebra"]);
  });
});

describe("parseOpenApiSpec - sub-action classification", () => {
  it("classifies POST on sub-resource as sub-action", () => {
    const specWithSubAction = {
      openapi: "3.1.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/v1/admin/users/{userId}/deactivate": {
          post: { summary: "Deactivate user", responses: { "200": { description: "OK" } } },
        },
      },
    };
    const result = parseOpenApiSpec(specWithSubAction, BASE_URL, PRODUCT_ID);
    const op = result.allOperations[0];
    expect(op.operationType).toBe("sub-action");
  });

  it("classifies GET on /resource/{id}/sub/{subId} as sub-detail", () => {
    const specWithSubDetail = {
      openapi: "3.1.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/v1/admin/users/{userId}/credits/{creditId}": {
          get: { summary: "Get credit", responses: { "200": { description: "OK" } } },
        },
      },
    };
    const result = parseOpenApiSpec(specWithSubDetail, BASE_URL, PRODUCT_ID);
    const op = result.allOperations[0];
    expect(op.operationType).toBe("sub-detail");
  });

  it("classifies PATCH on sub-resource with ID as sub-action", () => {
    const specWithSubPatch = {
      openapi: "3.1.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/v1/admin/users/{userId}/credits/{creditId}": {
          patch: { summary: "Update credit", responses: { "200": { description: "OK" } } },
        },
      },
    };
    const result = parseOpenApiSpec(specWithSubPatch, BASE_URL, PRODUCT_ID);
    const op = result.allOperations[0];
    expect(op.operationType).toBe("sub-action");
  });

  it("classifies DELETE on resource/{id} as delete (not sub-action)", () => {
    const specWithDelete = {
      openapi: "3.1.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {
        "/api/v1/admin/users/{userId}": {
          delete: { summary: "Delete user", responses: { "200": { description: "OK" } } },
        },
      },
    };
    const result = parseOpenApiSpec(specWithDelete, BASE_URL, PRODUCT_ID);
    const op = result.allOperations[0];
    expect(op.operationType).toBe("delete");
  });
});

describe("parseOpenApiSpec - admin prefix detection edge cases", () => {
  it("handles baseUrl that is not a valid URL (fallback regex)", () => {
    const spec = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/api/v1/admin/items": {
          get: { summary: "List", responses: { "200": { description: "OK" } } },
        },
      },
    };
    const result = parseOpenApiSpec(spec, "/api/v1/admin", PRODUCT_ID);
    expect(result.adminPrefix).toBe("/api/v1/admin");
    expect(result.allOperations.length).toBe(1);
  });

  it("returns empty operations for spec with no matching admin paths", () => {
    const spec = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/public/items": {
          get: { summary: "List", responses: { "200": { description: "OK" } } },
        },
      },
    };
    const result = parseOpenApiSpec(spec, BASE_URL, PRODUCT_ID);
    expect(result.allOperations.length).toBe(0);
    expect(result.resources.length).toBe(0);
  });
});
