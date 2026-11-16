import { api } from "@/lib/api";
import type { ProductAttribute, ProductAttributeValue } from "@/lib/types";

export async function fetchAttributes(
  includeInactive = false
): Promise<ProductAttribute[]> {
  const q = includeInactive ? "?includeInactive=true" : "";
  return api<ProductAttribute[]>(`/attributes${q}`);
}

export async function fetchAttribute(id: string): Promise<ProductAttribute> {
  return api<ProductAttribute>(`/attributes/${id}`);
}

export async function createAttribute(body: {
  code: string;
  name: string;
  description?: string;
  displayType?: string;
  sequence?: number;
}): Promise<ProductAttribute> {
  return api<ProductAttribute>("/attributes", { method: "POST", body });
}

export async function updateAttribute(
  id: string,
  body: {
    code?: string;
    name?: string;
    description?: string | null;
    displayType?: string;
    sequence?: number;
    isActive?: boolean;
  }
): Promise<ProductAttribute> {
  return api<ProductAttribute>(`/attributes/${id}`, { method: "PATCH", body });
}

export async function deleteAttribute(
  id: string
): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/attributes/${id}`, { method: "DELETE" });
}

export async function createAttributeValue(body: {
  attributeId: string;
  code: string;
  name: string;
  colorHex?: string | null;
  sequence?: number;
  isActive?: boolean;
}): Promise<ProductAttributeValue> {
  return api<ProductAttributeValue>("/attributes/values", {
    method: "POST",
    body,
  });
}

export async function updateAttributeValue(
  id: string,
  body: {
    attributeId?: string;
    code?: string;
    name?: string;
    colorHex?: string | null;
    sequence?: number;
    isActive?: boolean;
  }
): Promise<ProductAttributeValue> {
  return api<ProductAttributeValue>(`/attributes/values/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteAttributeValue(
  id: string
): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/attributes/values/${id}`, {
    method: "DELETE",
  });
}
