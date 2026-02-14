import { AdminApiClient } from "./admin-api-client";
import { getProduct, getAllProducts } from "@/lib/db/products";

interface CachedClient {
  client: AdminApiClient;
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

class ProductClientManager {
  private clients = new Map<string, CachedClient>();

  getClient(productId: string): AdminApiClient {
    const cached = this.clients.get(productId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.client;
    }

    // Remove expired entry
    if (cached) {
      this.clients.delete(productId);
    }

    const product = getProduct(productId);
    if (!product) {
      throw new Error(`Product "${productId}" not found in registry`);
    }
    if (product.status === "inactive") {
      throw new Error(`Product "${productId}" is inactive`);
    }

    const client = new AdminApiClient({
      productId: product.id,
      baseUrl: product.baseUrl,
      apiKey: product.apiKey,
      timeout: 10_000,
    });

    // Evict oldest if at capacity
    if (this.clients.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.clients.keys().next().value;
      if (oldestKey) this.clients.delete(oldestKey);
    }

    this.clients.set(productId, { client, cachedAt: Date.now() });
    return client;
  }

  invalidate(productId: string): void {
    this.clients.delete(productId);
  }

  invalidateAll(): void {
    this.clients.clear();
  }

  getAllClients(): { productId: string; client: AdminApiClient }[] {
    const products = getAllProducts().filter((p) => p.status === "active");
    return products.map((p) => ({
      productId: p.id,
      client: this.getClient(p.id),
    }));
  }
}

let manager: ProductClientManager | null = null;

export function getClientManager(): ProductClientManager {
  if (!manager) {
    manager = new ProductClientManager();
  }
  return manager;
}
