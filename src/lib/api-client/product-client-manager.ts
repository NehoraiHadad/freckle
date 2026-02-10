import { AdminApiClient } from "./admin-api-client";
import { getProduct, getAllProducts } from "@/lib/db/products";

class ProductClientManager {
  private clients = new Map<string, AdminApiClient>();

  getClient(productId: string): AdminApiClient {
    let client = this.clients.get(productId);
    if (client) return client;

    const product = getProduct(productId);
    if (!product) {
      throw new Error(`Product "${productId}" not found in registry`);
    }
    if (product.status === "inactive") {
      throw new Error(`Product "${productId}" is inactive`);
    }

    client = new AdminApiClient({
      productId: product.id,
      baseUrl: product.baseUrl,
      apiKey: product.apiKey,
      timeout: 10_000,
    });

    this.clients.set(productId, client);
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
