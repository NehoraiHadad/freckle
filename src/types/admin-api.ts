// Standard Admin API types from Freckle standard v1.1

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AdminApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface AdminApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type AdminApiResponse<T> = AdminApiSuccess<T> | AdminApiErrorResponse;

export interface ActivityEvent {
  id: string;
  type: string;
  actor: { id: string; name: string | null } | null;
  description: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface HealthResponse {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  [key: string]: unknown;
}

export interface MetaResponse {
  product: string;
  displayName: string;
  version: string;
  apiStandardVersion: string;
  baseUrl: string;
  capabilities: Capability[];
  contentTypes: string[];
  description: string;
  supportedActions: Record<string, string[]>;
}

export type Capability = string;

export interface StatsResponse {
  generatedAt?: string;
  [section: string]: unknown;
}

export interface TrendsResponse {
  period: string;
  points: Array<{
    date: string;
    [metric: string]: string | number;
  }>;
}

export interface ProductSummary {
  slug: string;
  displayName: string;
  healthStatus: HealthStatus;
  version: string;
  lastCheckedAt: string;
}

// ============================================
// Request Types
// ============================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export interface ActionRequest {
  action: string;
  params?: Record<string, unknown>;
}

// ============================================
// Operations
// ============================================

export interface ActionResponse {
  action: string;
  result: unknown;
}

// ============================================
// Generic Entity
// ============================================

export interface AdminEntityItem {
  id?: string;
  [key: string]: unknown;
}
