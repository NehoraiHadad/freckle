import { NextResponse } from "next/server";
import { checkAllProducts } from "@/lib/health/health-service";

export async function GET() {
  const results = await checkAllProducts();

  return NextResponse.json({
    success: true,
    data: results,
    checkedAt: new Date().toISOString(),
  });
}
