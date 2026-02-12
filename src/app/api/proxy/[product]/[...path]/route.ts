import { NextRequest, NextResponse } from "next/server";
import { getClientManager } from "@/lib/api-client/product-client-manager";
import { classifyError } from "@/lib/api-client/errors";

interface RouteParams {
  params: Promise<{ product: string; path: string[] }>;
}

function validateOrigin(request: NextRequest): boolean {
  const method = request.method;
  if (method === "GET" || method === "HEAD") return true;

  const origin = request.headers.get("origin");
  // Allow server-side requests with no origin
  if (!origin) return true;

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

async function handleProxy(request: NextRequest, { params }: RouteParams) {
  if (!validateOrigin(request)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CSRF_VALIDATION_FAILED",
          message: "Cross-origin requests are not allowed",
        },
      },
      { status: 403 },
    );
  }

  const { product, path } = await params;
  const apiPath = "/" + path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = searchParams ? `${apiPath}?${searchParams}` : apiPath;

  let client;
  try {
    client = getClientManager().getClient(product);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: error instanceof Error ? error.message : "Product not found",
        },
      },
      { status: 404 },
    );
  }

  try {
    let body: unknown = undefined;
    if (request.method !== "GET" && request.method !== "DELETE") {
      try {
        body = await request.json();
      } catch (e) {
        console.error("[API Proxy] Failed to parse request JSON body:", e instanceof Error ? e.message : e);
      }
    }

    const response = await client.rawProxyRequest(request.method, fullPath, body);
    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[API Proxy] Request failed:", error instanceof Error ? error.message : error);
    const classified = classifyError(error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: classified.category.toUpperCase(),
          message: classified.userMessage,
        },
      },
      { status: 502 },
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
