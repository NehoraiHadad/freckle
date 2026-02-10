// ============================================
// Product Registry
// ============================================

export type ProductStatus = "active" | "inactive" | "unreachable";
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  baseUrl: string;
  apiKey: string;
  iconUrl: string | null;
  status: ProductStatus;
  healthStatus: HealthStatus;
  lastHealthCheck: string | null;
  capabilities: string[];
  supportedActions: Record<string, string[]>;
  apiStandardVersion: string | null;
  productVersion: string | null;
  displayOrder: number;
  addedAt: string;
  updatedAt: string;
}

export type ProductForDisplay = Omit<Product, "apiKey">;

export interface ProductInput {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  apiKey: string;
  iconUrl?: string;
  displayOrder?: number;
}

// ============================================
// Stats Cache
// ============================================

export type StatType = "stats" | "trends_24h" | "trends_7d" | "trends_30d" | "meta";

export interface CachedStat {
  productId: string;
  statType: StatType;
  data: unknown;
  fetchedAt: string;
  expiresAt: string;
}

// ============================================
// Health Check
// ============================================

export interface HealthCheck {
  id: number;
  productId: string;
  status: HealthStatus | "unreachable";
  responseMs: number | null;
  version: string | null;
  error: string | null;
  checkedAt: string;
}

// ============================================
// Audit Log
// ============================================

export type AuditResult = "success" | "error";

export interface AuditLogEntry {
  id: number;
  productId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  result: AuditResult;
  errorMessage: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogInput {
  productId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  result?: AuditResult;
  errorMessage?: string;
  ipAddress?: string;
}
