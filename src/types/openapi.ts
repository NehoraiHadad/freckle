// Types for parsed OpenAPI spec data

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type OperationType =
  | "list"      // GET /resource (collection)
  | "detail"    // GET /resource/{id}
  | "create"    // POST /resource
  | "update"    // PATCH/PUT /resource/{id}
  | "delete"    // DELETE /resource/{id}
  | "action"    // POST /resource/{id}/verb or POST /resource/verb
  | "sub-list"  // GET /resource/{id}/sub-resource
  | "sub-detail"// GET /resource/{id}/sub-resource/{subId}
  | "sub-action"// POST/PUT/PATCH/DELETE on sub-resource
  | "custom";   // anything else

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  $ref?: string;
  format?: string;
  description?: string;
  nullable?: boolean;
  additionalProperties?: boolean | JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  const?: unknown;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ApiOperation {
  id: string;                    // unique ID (uuid or generated)
  resourceKey: string;           // e.g., "users", "users.credits", "feedback"
  operationType: OperationType;
  httpMethod: HttpMethod;
  pathTemplate: string;          // e.g., "/feedback/{feedbackId}" (admin prefix stripped)
  summary?: string;
  description?: string;
  pathParameters: string[];      // e.g., ["feedbackId"]
  requestBodySchema?: JsonSchema; // resolved (no $ref)
  responseSchema?: JsonSchema;
  tags?: string[];
}

export interface ApiResource {
  key: string;                   // dot-separated: "users", "users.credits", "users.credits.history"
  name: string;                  // display name: "Users", "Credits", "Credit History"
  parentKey: string | null;      // parent resource key or null for top-level
  pathSegment: string;           // the segment name: "users", "credits", "history"
  requiresParentId: boolean;     // true if path requires a parent entity ID to access
  operations: ApiOperation[];    // all operations on this resource
  children: ApiResource[];       // child/sub-resources
}

export interface ParsedSpec {
  productId: string;
  specVersion: string;           // "3.1.0"
  apiTitle: string;
  apiVersion: string;
  adminPrefix: string;           // e.g., "/api/v1/admin" - detected and stripped
  resources: ApiResource[];      // top-level resources (tree structure)
  allOperations: ApiOperation[]; // flat list of all operations
  schemas: Record<string, JsonSchema>; // resolved component schemas
  parsedAt: string;              // ISO timestamp
}

export type DiscoveryMode = "openapi";
