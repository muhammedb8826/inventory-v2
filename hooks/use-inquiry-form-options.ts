"use client";

import { useMemo } from "react";
import { apiList } from "@/lib/list-response";
import { fetchAllInventory, uniqueItemsFromStock } from "@/lib/inventory-fetch";
import type { Customer, UserAdmin } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import type { ItemSearchOption } from "@/components/shared/item-search-select";

export function useInquiryFormOptions() {
  const {
    data: customers,
    reload: reloadCustomers,
    setData: setCustomers,
  } = useFetch(() => apiList<Customer>("/customers"), []);
  const { data: users } = useFetch(() => apiList<UserAdmin>("/users"), []);
  const { data: stock } = useFetch(() => fetchAllInventory(), []);

  const customerOptions = useMemo(
    () =>
      (customers ?? [])
        .filter((c) => c.isActive !== false)
        .map((c) => ({ id: c.id, label: c.name })),
    [customers]
  );

  const userOptions = useMemo(
    () =>
      (users ?? [])
        .filter((u) => u.isActive !== false)
        .map((u) => ({
          id: u.id,
          label: u.fullName || u.email,
        })),
    [users]
  );

  const itemOptions: ItemSearchOption[] = useMemo(
    () =>
      uniqueItemsFromStock(stock ?? []).map((item) => ({
        itemId: item.id,
        label: item.sku
          ? `${item.description} (${item.sku})`
          : item.description,
      })),
    [stock]
  );

  return {
    customerOptions,
    userOptions,
    itemOptions,
    reloadCustomers,
    setCustomers,
  };
}
