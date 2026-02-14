import { describe, it, expect } from "vitest";
import { collectResourceKeys } from "../object-utils";
import type { ApiResource } from "@/types/openapi";

function makeResource(key: string, children: ApiResource[] = []): ApiResource {
  return {
    key,
    name: key,
    parentKey: null,
    pathSegment: key,
    requiresParentId: false,
    operations: [],
    children,
  };
}

describe("collectResourceKeys", () => {
  it("collects keys from flat list", () => {
    const resources = [makeResource("users"), makeResource("posts")];
    const keys = collectResourceKeys(resources);
    expect(keys).toEqual(new Set(["users", "posts"]));
  });

  it("collects keys from nested tree", () => {
    const resources = [
      makeResource("users", [
        makeResource("users.credits", [makeResource("users.credits.history")]),
      ]),
    ];
    const keys = collectResourceKeys(resources);
    expect(keys).toEqual(new Set(["users", "users.credits", "users.credits.history"]));
  });

  it("collects keys from multiple top-level with nested children", () => {
    const resources = [
      makeResource("users", [makeResource("users.settings")]),
      makeResource("posts", [makeResource("posts.comments")]),
    ];
    const keys = collectResourceKeys(resources);
    expect(keys).toEqual(
      new Set(["users", "users.settings", "posts", "posts.comments"])
    );
  });

  it("returns empty set for empty input", () => {
    expect(collectResourceKeys([])).toEqual(new Set());
  });

  it("handles single resource with no children", () => {
    const resources = [makeResource("users")];
    const keys = collectResourceKeys(resources);
    expect(keys).toEqual(new Set(["users"]));
  });

  it("handles deeply nested resources", () => {
    const resources = [
      makeResource("a", [
        makeResource("a.b", [
          makeResource("a.b.c", [
            makeResource("a.b.c.d"),
          ]),
        ]),
      ]),
    ];
    const keys = collectResourceKeys(resources);
    expect(keys).toEqual(new Set(["a", "a.b", "a.b.c", "a.b.c.d"]));
  });
});
