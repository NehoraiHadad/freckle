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

export interface AdminApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type AdminApiResponse<T> = AdminApiSuccess<T> | AdminApiError;

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  lastActiveAt: string | null;
  stats: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface AdminUserDetail extends AdminUser {
  recentActivity: ActivityEvent[];
}

export interface AdminContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  author: {
    id: string;
    name: string | null;
  };
  createdAt: string;
  updatedAt: string;
  stats: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

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

export type Capability =
  | "users"
  | "content"
  | "analytics"
  | "config"
  | "credits"
  | "operations"
  | "webhooks"
  | "feedback"
  | "drafts"
  | (string & {});  // Allow any string while keeping autocomplete

export interface StatsResponse {
  users?: {
    total: number;
    active: number;
    newLast30d: number;
  };
  content?: {
    total: number;
    publishedTotal: number;
    createdLast30d: number;
  };
  custom: Record<string, unknown>;
  generatedAt: string;
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

export interface DeleteResponse {
  deleted: true;
  id: string;
}

// ============================================
// Webhooks
// ============================================

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  active: boolean;
}

// ============================================
// Generic Entity
// ============================================

export interface AdminEntityItem {
  id: string;
  [key: string]: unknown;
}
