"use client";

import { useMemo } from "react";
import { apiList } from "@/lib/list-response";
import { fetchAllInventory, uniqueItemsFromStock } from "@/lib/inventory-fetch";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { Customer, Item, ItemType } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import type { ItemSearchOption } from "@/components/shared/item-search-select";

export type InquiryItemOption = ItemSearchOption & {
  itemType?: ItemType | null;
};

export function useInquiryFormOptions() {
  const { user } = useAuth();
  const canCustomers = hasPermission(user, "customers.read");
  const canInventory = hasPermission(user, "inventory.read");

  const {
    data: customers,
    reload: reloadCustomers,
    setData: setCustomers,
  } = useFetch(
    () => apiList<Customer>("/customers"),
    [],
    { enabled: canCustomers }
  );

  const { data: stock } = useFetch(
    () => fetchAllInventory(),
    [],
    { enabled: canInventory }
  );

  const customerOptions = useMemo(
    () =>
      (customers ?? [])
        .filter((c) => c.isActive !== false)
        .map((c) => ({ id: c.id, label: c.name })),
    [customers]
  );

  const catalogItems: Item[] = useMemo(
    () => uniqueItemsFromStock(stock ?? []),
    [stock]
  );

  const itemOptions: InquiryItemOption[] = useMemo(
    () =>
      catalogItems.map((item) => ({
        itemId: item.id,
        label: item.sku
          ? `${item.description} (${item.sku})`
          : item.description,
        itemType: item.itemType ?? null,
      })),
    [catalogItems]
  );

  return {
    customers: customers ?? [],
    customerOptions,
    itemOptions,
    reloadCustomers,
    setCustomers,
  };
}
