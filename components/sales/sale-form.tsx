"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QuickCustomerDialog } from "@/components/customers/quick-customer-dialog";
import { QuickLocationDialog } from "@/components/locations/quick-location-dialog";
import { QuickBankAccountDialog } from "@/components/banks/quick-bank-account-dialog";
import { QuickStockItemDialog } from "@/components/inventory/quick-stock-item-dialog";
import { withSelectCreateTrigger } from "@/components/shared/create-in-select";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import { SearchSelect } from "@/components/shared/search-select";
import { LineUomSelect } from "@/components/uom/line-uom-select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeFormToolbar,
  FrappeGridCell,
  FrappeGridRow,
  FrappeGridTable,
  FrappeSection,
  FrappeButtonPrimary,
  FrappeButtonLink,
} from "@/components/frappe";
import { api, ApiRequestError } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { creditHasPayments, needsBankAccount } from "@/lib/document-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  bankAccountSelectOptions,
  bankAccountsUrl,
  bankAccountTypeForPayment,
  paymentAccountFieldLabel,
  resolveBankAccountId,
  showsPaymentAccountPicker,
} from "@/lib/bank-accounts";
import {
  bankAccountValidationError,
  onPaymentMethodChange,
  useAutoPaymentAccount,
} from "@/hooks/use-payment-bank-account";
import { fetchInventoryForLocation } from "@/lib/inventory-fetch";
import { findDefaultLocationId } from "@/lib/inventory-defaults";
import { buildItemOptionMap, itemOptionsFromMap, parseDocumentLines, productItemId, resolveItem, type DocumentLineBody } from "@/lib/inventory-items";
import { defaultUomIdForItem, fetchUoms, itemAllowsCuts } from "@/lib/uom";
import { saleRepUser } from "@/lib/sale-utils";
import { errorMessage, formatMoney, formatQty } from "@/lib/format";
import {
  COMMISSION_BASIS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from "@/lib/form-select-options";
import { fetchCustomers, partySelectOptions } from "@/lib/party-fetch";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import type {
  BankAccount,
  CommissionBasis,
  Customer,
  Inquiry,
  Item,
  Location,
  PaymentMethod,
  ProductionSuggestion,
  Sale,
  StockRecord,
  UserAdmin,
} from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

interface LineRow {
  itemId: string;
  quantity: string;
  unitPrice: string;
  uomId: string;
  item?: Item;
  width: string;
  height: string;
}

function emptyLine(): LineRow {
  return {
    itemId: "",
    quantity: "1",
    unitPrice: "",
    uomId: "",
    width: "",
    height: "",
  };
}

function linesFromSale(sale: Sale): LineRow[] {
  const rows = (sale.lines ?? []).map((l) => {
    const itemId = productItemId({ itemId: l.itemId, item: l.item });
    const item = l.item ? resolveItem(itemId, l.item) : undefined;
    const isCut = Boolean(l.dimWidth || l.dimHeight);
    return {
      itemId,
      quantity: isCut && l.dimPieces ? String(l.dimPieces) : l.quantity,
      unitPrice: l.unitPrice,
      uomId: l.uomId ?? defaultUomIdForItem(item, "sales") ?? "",
      item,
      width: l.dimWidth ?? "",
      height: l.dimHeight ?? "",
    };
  });
  return rows.length > 0 ? rows : [emptyLine()];
}

export function SaleForm({
  sale,
  inquiryId,
}: {
  sale?: Sale;
  /** Prefill from inquiry and link after create (Convert to sale). */
  inquiryId?: string | null;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = !!sale?.id;
  const notesOnly = isEdit && creditHasPayments(sale?.customerCredit);

  const [customerId, setCustomerId] = useState(sale?.customerId ?? "");
  const [locationId, setLocationId] = useState(sale?.locationId ?? "");
  const [itemQuery, setItemQuery] = useState("");
  const debouncedItemQuery = useDebouncedValue(itemQuery, 300);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    sale?.paymentMethod ?? "CASH"
  );
  const [bankAccountId, setBankAccountId] = useState(sale?.bankAccountId ?? "");
  const [creditDueDate, setCreditDueDate] = useState(
    sale?.creditDueDate?.slice(0, 10) ?? ""
  );
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [soldByUserId, setSoldByUserId] = useState(
    () =>
      sale?.soldByUserId ??
      saleRepUser(sale ?? {})?.id ??
      ""
  );
  const [commissionPercent, setCommissionPercent] = useState(() => {
    if (
      sale?.commissionPercent != null &&
      sale.commissionPercent !== ""
    ) {
      return String(sale.commissionPercent);
    }
    return sale ? "" : "10";
  });
  const [commissionBasis, setCommissionBasis] = useState<CommissionBasis>(
    () => sale?.commissionBasis ?? "PROFIT"
  );
  const [notes, setNotes] = useState(sale?.notes ?? "");
  const [linkedInquiryId, setLinkedInquiryId] = useState(inquiryId ?? "");
  const canOnBehalf = hasPermission(user, "sales.on_behalf");

  /** Rep for API/UI: explicit pick, or logged-in user on new sales once auth loads. */
  const effectiveSoldByUserId =
    soldByUserId ||
    (!isEdit && !notesOnly && user?.id ? user.id : "");

  const [lines, setLines] = useState<LineRow[]>(() =>
    sale ? linesFromSale(sale) : [emptyLine()]
  );
  const { data: uomsData, loading: uomsLoading } = useFetch(
    () => fetchUoms(undefined, false),
    []
  );
  const uoms = uomsData ?? [];
  const [saving, setSaving] = useState(false);
  const [productionPrompt, setProductionPrompt] = useState<{
    suggestions: ProductionSuggestion[];
    body: Record<string, unknown>;
  } | null>(null);

  const {
    data: customers,
    loading: customersLoading,
    reload: reloadCustomers,
    setData: setCustomers,
  } = useFetch(() => fetchCustomers(), []);
  const { data: salesReps } = useFetch(
    () =>
      canOnBehalf && !notesOnly
        ? apiList<UserAdmin>("/users")
        : Promise.resolve([]),
    [canOnBehalf, notesOnly]
  );
  const activeSalesReps = (salesReps ?? []).filter(
    (u) => u.isActive !== false
  );
  const {
    data: locations,
    loading: locationsLoading,
    reload: reloadLocations,
    setData: setLocations,
  } = useLocations();
  const paymentAccountType = bankAccountTypeForPayment(paymentMethod);
  const {
    data: banks,
    loading: banksLoading,
    reload: reloadBanks,
    setData: setBanks,
  } = useFetch(
    () =>
      paymentAccountType
        ? apiList<BankAccount>(bankAccountsUrl(paymentAccountType))
        : Promise.resolve([]),
    [paymentAccountType]
  );

  useEffect(() => {
    if (isEdit || !inquiryId) return;
    let cancelled = false;
    api<Inquiry>(`/inquiries/${inquiryId}`)
      .then((inquiry) => {
        if (cancelled) return;
        setLinkedInquiryId(inquiry.id);
        if (inquiry.customerId) setCustomerId(inquiry.customerId);
        const noteParts = [
          `From inquiry: ${inquiry.subject}`,
          inquiry.companyName ? `Company: ${inquiry.companyName}` : null,
          inquiry.contactName ? `Contact: ${inquiry.contactName}` : null,
        ].filter(Boolean);
        setNotes((prev) => prev || noteParts.join(" · "));
        const interest = (inquiry.lines ?? []).filter((l) => l.itemId);
        if (interest.length > 0) {
          setLines(
            interest.map((l) => {
              const item = l.item
                ? resolveItem(l.itemId, l.item)
                : undefined;
              return {
                itemId: l.itemId,
                quantity:
                  l.quantity != null && String(l.quantity).trim() !== ""
                    ? String(Number(l.quantity))
                    : "1",
                unitPrice:
                  l.unitPrice != null && String(l.unitPrice).trim() !== ""
                    ? String(Number(l.unitPrice))
                    : "",
                uomId: defaultUomIdForItem(item, "sales") ?? "",
                item,
                width: "",
                height: "",
              };
            })
          );
        }
      })
      .catch((err) => toast.error(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [inquiryId, isEdit]);

  useAutoPaymentAccount(
    paymentMethod,
    banks,
    bankAccountId,
    setBankAccountId
  );

  // New sales: default location to warehouse (or first active).
  useEffect(() => {
    if (isEdit || locationId || !locations?.length) return;
    const defaultId = findDefaultLocationId(locations);
    if (defaultId) setLocationId(defaultId);
  }, [isEdit, locationId, locations]);

  const {
    data: stock,
    loading: stockLoading,
    reload: reloadStock,
    setData: setStock,
  } = useFetch(
    () =>
      locationId
        ? fetchInventoryForLocation(locationId, debouncedItemQuery || undefined)
        : Promise.resolve([]),
    [locationId, debouncedItemQuery]
  );

  const stockItems = stock ?? [];
  const itemMap = buildItemOptionMap(
    stockItems,
    [...lines, ...(sale?.lines ?? [])]
  );
  const itemOptions = itemOptionsFromMap(itemMap);

  const subtotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      if (!line.itemId.trim() || !line.unitPrice.trim()) return sum;
      const qty = parseFloat(line.quantity);
      const price = parseFloat(line.unitPrice);
      if (Number.isNaN(price) || price < 0) return sum;
      const q = Number.isNaN(qty) || qty <= 0 ? 1 : qty;
      return sum + q * price;
    }, 0);
  }, [lines]);

  const customerOptions = partySelectOptions(
    customers ?? [],
    customerId,
    sale?.customer
  );
  const salesRepOptions = (() => {
    const options = activeSalesReps.map((u) => ({
      value: u.id,
      label: u.fullName,
    }));
    if (
      effectiveSoldByUserId &&
      !options.some((option) => option.value === effectiveSoldByUserId)
    ) {
      const rep = saleRepUser(sale ?? {});
      options.unshift({
        value: effectiveSoldByUserId,
        label: rep?.fullName ?? user?.fullName ?? "Selected rep",
      });
    }
    return options;
  })();

  const dataLoading =
    (customers === null && customersLoading) ||
    (locations === null && locationsLoading) ||
    (banks === null && banksLoading);
  const canNegativeStock = hasPermission(user, "sales.negative_stock");

  function onCustomerCreated(customer: Customer) {
    setCustomers((prev) => [...(prev ?? []), customer]);
    setCustomerId(customer.id);
    reloadCustomers();
  }

  function onLocationCreated(location: Location) {
    setLocations((prev) => [...(prev ?? []), location]);
    onLocationChange(location.id);
    reloadLocations();
  }

  function onLocationChange(id: string) {
    setLocationId(id);
    setItemQuery("");
  }

  function onBankCreated(account: BankAccount) {
    setBanks((prev) => [...(prev ?? []), account]);
    setBankAccountId(account.id);
    reloadBanks();
  }

  function onStockCreated(record: StockRecord) {
    setStock((prev) => [...(prev ?? []), record]);
    reloadStock();
    const emptyIdx = lines.findIndex((l) => !l.itemId);
    const idx = emptyIdx >= 0 ? emptyIdx : 0;
    const item = resolveItem(productItemId(record), record.item);
    updateLine(idx, {
      itemId: productItemId(record),
      unitPrice: record.purchasePrice,
      uomId: defaultUomIdForItem(item, "sales") ?? "",
      item,
    });
  }

  function updateLine(i: number, patch: Partial<LineRow>) {
    setLines((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    );
  }

  function buildBody(
    documentLines: DocumentLineBody[]
  ): Record<string, unknown> | { error: string } {
    const body: Record<string, unknown> = {
      locationId,
      paymentMethod,
      notes: notes || undefined,
      lines: documentLines,
    };
    if (customerId) body.customerId = customerId;
    if (needsBankAccount(paymentMethod)) {
      body.bankAccountId = resolveBankAccountId(
        paymentMethod,
        banks,
        bankAccountId
      );
    }
    if (paymentMethod === "CREDIT" && creditDueDate) {
      body.creditDueDate = creditDueDate;
    }
    if (allowNegativeStock) body.allowNegativeStock = true;
    if (canOnBehalf && effectiveSoldByUserId) {
      body.soldByUserId = effectiveSoldByUserId;
    }
    if (commissionPercent.trim()) {
      const pct = parseFloat(commissionPercent);
      if (!Number.isNaN(pct)) {
        if (pct < 0 || pct > 100) {
          return { error: "Commission must be between 0 and 100." };
        }
        body.commissionPercent = pct;
        body.commissionBasis = commissionBasis;
      }
    }
    return body;
  }

  function isProductionRequiredError(
    err: unknown
  ): err is ApiRequestError & {
    data: { code: string; productionSuggestions: ProductionSuggestion[] };
  } {
    if (!(err instanceof ApiRequestError) || err.status !== 409) return false;
    const data = err.data as {
      code?: string;
      productionSuggestions?: ProductionSuggestion[];
    } | null;
    return (
      data?.code === "PRODUCTION_REQUIRED" &&
      Array.isArray(data.productionSuggestions) &&
      data.productionSuggestions.length > 0
    );
  }

  async function submitSaleBody(body: Record<string, unknown>) {
    if (isEdit && sale) {
      const updated = await api<Sale>(`/sales/${sale.id}`, {
        method: "PATCH",
        body,
      });
      const poCount = updated.productionOrders?.filter(
        (po) => po.status !== "CANCELLED"
      ).length;
      if (poCount) {
        toast.success(
          `Sale updated · ${poCount} draft production order${poCount === 1 ? "" : "s"} created`
        );
      } else if (updated.stockWarnings?.length) {
        toast.warning(updated.stockWarnings.join("; "));
      } else {
        toast.success("Sale updated");
      }
      requestNotificationsRefresh();
      router.push(`/sales/${sale.id}`);
      return;
    }

    const res = await api<Sale>("/sales", { method: "POST", body });
    if (linkedInquiryId) {
      try {
        await api(`/inquiries/${linkedInquiryId}`, {
          method: "PATCH",
          body: { convertedSaleId: res.id, status: "ORDERED" },
        });
      } catch {
        toast.warning(
          "Sale created, but inquiry could not be marked converted"
        );
      }
    }
    const poCount = res.productionOrders?.filter(
      (po) => po.status !== "CANCELLED"
    ).length;
    if (poCount) {
      toast.success(
        `${linkedInquiryId ? "Sale recorded · inquiry converted" : "Sale recorded"} · ${poCount} draft production order${poCount === 1 ? "" : "s"} created`
      );
    } else if (res.stockWarnings?.length) {
      toast.warning(res.stockWarnings.join("; "));
    } else {
      toast.success(
        linkedInquiryId ? "Sale recorded · inquiry converted" : "Sale recorded"
      );
    }
    requestNotificationsRefresh();
    router.push(`/sales/${res.id}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (paymentMethod === "CREDIT" && !customerId) {
      toast.error("Customer is required for credit sales");
      return;
    }
    if (!notesOnly && !locationId) {
      toast.error("Location is required — set it under Other Info");
      return;
    }
    const resolvedBankId = resolveBankAccountId(
      paymentMethod,
      banks,
      bankAccountId
    );
    const bankError = bankAccountValidationError(
      paymentMethod,
      banks,
      resolvedBankId
    );
    if (bankError) {
      toast.error(bankError);
      return;
    }
    if (canOnBehalf && !notesOnly && !effectiveSoldByUserId) {
      toast.error("Select a sales rep");
      return;
    }
    let body: Record<string, unknown>;
    if (notesOnly) {
      body = { notes: notes || undefined };
    } else {
      const parsedLines = parseDocumentLines(lines);
      if ("error" in parsedLines) {
        toast.error(parsedLines.error);
        return;
      }
      const built = buildBody(parsedLines.lines);
      if ("error" in built && typeof built.error === "string") {
        toast.error(built.error);
        return;
      }
      body = built;
    }
    setSaving(true);
    try {
      await submitSaleBody(body);
    } catch (err) {
      if (isProductionRequiredError(err)) {
        setProductionPrompt({
          suggestions: err.data.productionSuggestions,
          body,
        });
        return;
      }
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmProductionAndSave() {
    if (!productionPrompt) return;
    const body = {
      ...productionPrompt.body,
      proceedWithProduction: true,
    };
    setProductionPrompt(null);
    setSaving(true);
    try {
      await submitSaleBody(body);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (dataLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    );
  }

  const cancelHref = isEdit && sale ? `/sales/${sale.id}` : "/sales";
  const selectedCustomer = (customers ?? []).find((c) => c.id === customerId);
  const locationLabel =
    (locations ?? []).find((l) => l.id === locationId)?.name ?? null;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-0">
      <FrappeFormToolbar>
        <FrappeButtonPrimary type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save" : "Record sale"}
        </FrappeButtonPrimary>
        <FrappeButtonLink href={cancelHref}>
          {isEdit ? "Back" : "Discard"}
        </FrappeButtonLink>
        {locationLabel ? (
          <span className="ml-auto hidden text-xs text-[var(--frappe-text-muted)] sm:inline">
            Selling from {locationLabel}
          </span>
        ) : null}
      </FrappeFormToolbar>

      {notesOnly ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Customer credit has payments — only notes can be changed.
        </div>
      ) : null}

      <FrappeDocument>
        <FrappeSection title="Customer">
          <FrappeFormGrid columns={2}>
            <EntitySelectField
              label="Customer"
              required={paymentMethod === "CREDIT" && !notesOnly}
              fullWidth
              value={customerId}
              onValueChange={setCustomerId}
              options={customerOptions}
              searchPlaceholder="Search by name, phone, or email…"
              listHref="/customers"
              listLabel="All customers"
              emptyMessage="Optional for cash/bank — required for credit."
              quickCreate={
                notesOnly ? undefined : (
                  <QuickCustomerDialog onCreated={onCustomerCreated} />
                )
              }
              disabled={notesOnly}
            />
            <FrappeField label="Payment method" required={!notesOnly}>
              <SearchSelect
                value={paymentMethod}
                onValueChange={(v) =>
                  onPaymentMethodChange(
                    v as PaymentMethod,
                    setPaymentMethod,
                    setBankAccountId
                  )
                }
                options={PAYMENT_METHOD_OPTIONS}
                searchPlaceholder="Search payment method…"
                disabled={notesOnly}
              />
            </FrappeField>
            {showsPaymentAccountPicker(paymentMethod, banks) ? (
              <EntitySelectField
                label={paymentAccountFieldLabel(paymentMethod)}
                required={!notesOnly}
                value={bankAccountId}
                onValueChange={setBankAccountId}
                options={bankAccountSelectOptions(banks ?? [], bankAccountId)}
                listHref="/banks"
                listLabel="All accounts"
                emptyMessage={
                  paymentMethod === "CASH"
                    ? "Create a cash till (CASH account type) under Bank."
                    : "Create a bank account (BANK account type) under Bank."
                }
                quickCreate={
                  notesOnly ? undefined : (
                    <QuickBankAccountDialog
                      defaultAccountType={
                        paymentMethod === "CASH" ? "CASH" : "BANK"
                      }
                      onCreated={onBankCreated}
                    />
                  )
                }
                disabled={notesOnly}
              />
            ) : paymentMethod === "CREDIT" ? (
              <FrappeField label="Credit due date">
                <Input
                  type="date"
                  value={creditDueDate}
                  onChange={(e) => setCreditDueDate(e.target.value)}
                  disabled={notesOnly}
                />
              </FrappeField>
            ) : (
              <div className="hidden md:block" />
            )}
            {selectedCustomer ? (
              <FrappeField label="Contact" fullWidth>
                <div className="rounded-md border border-[var(--frappe-border)] bg-[var(--frappe-section-head)]/40 px-3 py-2 text-sm text-[var(--frappe-text)]">
                  <div className="font-medium">{selectedCustomer.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--frappe-text-muted)]">
                    {[selectedCustomer.phone, selectedCustomer.email]
                      .filter(Boolean)
                      .join(" · ") || "No phone or email on this customer"}
                  </div>
                </div>
              </FrappeField>
            ) : null}
          </FrappeFormGrid>
        </FrappeSection>

        <Tabs defaultValue="lines" className="gap-0">
          <div className="border-b border-[var(--frappe-border)] px-4 sm:px-5">
            <TabsList
              variant="line"
              className="h-10 w-full justify-start rounded-none bg-transparent p-0"
            >
              <TabsTrigger
                value="lines"
                className="rounded-none px-3 data-active:text-[var(--erp-accent)]"
              >
                Order Lines
              </TabsTrigger>
              <TabsTrigger
                value="other"
                className="rounded-none px-3 data-active:text-[var(--erp-accent)]"
              >
                Other Info
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="lines" className="mt-0 p-4 sm:p-5">
            {notesOnly ? (
              <p className="text-sm text-[var(--frappe-text-muted)]">
                Line items are locked because this credit sale has payments.
              </p>
            ) : (
              <>
                <FrappeGridTable
                  columns={[
                    { key: "item", label: "Item" },
                    { key: "uom", label: "UOM", className: "w-24" },
                    { key: "w", label: "W", className: "w-20" },
                    { key: "h", label: "H", className: "w-20" },
                    { key: "qty", label: "Qty", className: "w-20" },
                    { key: "rate", label: "Unit price", className: "w-28" },
                    {
                      key: "amount",
                      label: "Amount",
                      className: "w-28 text-right",
                    },
                  ]}
                  onAddRow={() => setLines((prev) => [...prev, emptyLine()])}
                  addLabel="Add a line"
                >
                  {lines.map((line, i) => {
                    const cut = itemAllowsCuts(line.item, uoms);
                    const hasDefaultWidth =
                      line.item?.uomWidth != null &&
                      Number.isFinite(parseFloat(String(line.item.uomWidth))) &&
                      parseFloat(String(line.item.uomWidth)) > 0;
                    const isCutFilled = Boolean(
                      line.height.trim() &&
                        (line.width.trim() || hasDefaultWidth)
                    );
                    const lineUom =
                      uoms.find((u) => u.id === line.uomId) ||
                      line.item?.salesUom ||
                      line.item?.stockUom ||
                      null;
                    const dimSymbol =
                      lineUom?.symbol || lineUom?.code || "m";
                    const widthPlaceholder = hasDefaultWidth
                      ? `W (default ${line.item?.uomWidth})`
                      : `W (${dimSymbol})`;
                    const qty = parseFloat(line.quantity);
                    const price = parseFloat(line.unitPrice);
                    const amount =
                      line.itemId &&
                      !Number.isNaN(price) &&
                      price >= 0
                        ? (Number.isNaN(qty) || qty <= 0 ? 1 : qty) * price
                        : null;
                    return (
                      <FrappeGridRow
                        key={i}
                        canRemove
                        onRemove={() =>
                          setLines((prev) =>
                            prev.length <= 1
                              ? [emptyLine()]
                              : prev.filter((_, idx) => idx !== i)
                          )
                        }
                      >
                        <FrappeGridCell>
                          <ItemSearchSelect
                            value={line.itemId}
                            onValueChange={(v) => {
                              const item = itemMap.get(v);
                              updateLine(i, {
                                itemId: v,
                                item,
                                uomId:
                                  defaultUomIdForItem(item, "sales") ?? "",
                                width: "",
                                height: "",
                                quantity: "1",
                              });
                            }}
                            options={itemOptions}
                            disabled={!locationId}
                            loading={stockLoading}
                            filterLocally={false}
                            onQueryChange={setItemQuery}
                            placeholder="Select item…"
                            emptyMessage={
                              !locationId
                                ? "Set a selling location under Other Info."
                                : "No items found."
                            }
                            footer={
                              notesOnly
                                ? undefined
                                : (close) =>
                                    withSelectCreateTrigger(
                                      <QuickStockItemDialog
                                        locationId={locationId}
                                        onCreated={onStockCreated}
                                        disabled={!locationId}
                                      />,
                                      close,
                                      "Create new item",
                                      !locationId
                                    )
                            }
                          />
                        </FrappeGridCell>
                        <FrappeGridCell>
                          <LineUomSelect
                            value={line.uomId || null}
                            onValueChange={(uomId) =>
                              updateLine(i, { uomId: uomId ?? "" })
                            }
                            item={line.item}
                            uoms={uoms}
                            loading={uomsLoading}
                            disabled={!locationId}
                          />
                        </FrappeGridCell>
                        <FrappeGridCell>
                          {cut ? (
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              className="h-8"
                              value={line.width}
                              onChange={(e) =>
                                updateLine(i, { width: e.target.value })
                              }
                              placeholder={widthPlaceholder}
                              title={
                                hasDefaultWidth
                                  ? `Width in ${dimSymbol}; blank uses item constant width`
                                  : `Width in ${dimSymbol}`
                              }
                            />
                          ) : (
                            <span className="text-xs text-[var(--frappe-text-muted)]">
                              —
                            </span>
                          )}
                        </FrappeGridCell>
                        <FrappeGridCell>
                          {cut ? (
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              className="h-8"
                              value={line.height}
                              onChange={(e) =>
                                updateLine(i, { height: e.target.value })
                              }
                              placeholder={`H (${dimSymbol})`}
                              title={`Height in ${dimSymbol}`}
                            />
                          ) : (
                            <span className="text-xs text-[var(--frappe-text-muted)]">
                              —
                            </span>
                          )}
                        </FrappeGridCell>
                        <FrappeGridCell>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            className="h-8"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(i, { quantity: e.target.value })
                            }
                            required
                            title={
                              isCutFilled
                                ? "Number of pieces of this size"
                                : `Quantity in ${dimSymbol}`
                            }
                            placeholder={isCutFilled ? "Pcs" : "Qty"}
                          />
                        </FrappeGridCell>
                        <FrappeGridCell>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            className="h-8"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(i, { unitPrice: e.target.value })
                            }
                            required
                            placeholder="0.00"
                          />
                        </FrappeGridCell>
                        <FrappeGridCell>
                          <div className="flex h-8 items-center justify-end text-sm tabular-nums text-[var(--frappe-text)]">
                            {amount != null ? formatMoney(amount) : "—"}
                          </div>
                        </FrappeGridCell>
                      </FrappeGridRow>
                    );
                  })}
                </FrappeGridTable>

                <div className="mt-4 flex justify-end border-t border-[var(--frappe-border)] pt-3">
                  <div className="min-w-[10rem] text-right">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--frappe-text-muted)]">
                      Total
                    </div>
                    <div className="text-xl font-semibold tabular-nums text-[var(--frappe-text)]">
                      {formatMoney(subtotal)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="other" className="mt-0 p-4 sm:p-5">
            <FrappeFormGrid columns={2}>
              <EntitySelectField
                label="Selling location"
                required={!notesOnly}
                value={locationId}
                onValueChange={onLocationChange}
                options={(locations ?? []).map((l) => ({
                  id: l.id,
                  label: `${l.name} (${l.type})`,
                }))}
                listHref="/locations"
                listLabel="All locations"
                emptyMessage="Add a location to sell from."
                quickCreate={
                  notesOnly ? undefined : (
                    <QuickLocationDialog onCreated={onLocationCreated} />
                  )
                }
                disabled={notesOnly}
              />
              {canOnBehalf && !notesOnly ? (
                <FrappeField label="Sales rep" required>
                  <SearchSelect
                    value={effectiveSoldByUserId}
                    onValueChange={setSoldByUserId}
                    options={salesRepOptions}
                    placeholder="Select rep"
                    searchPlaceholder="Search by name…"
                    emptyMessage="No active users found."
                  />
                </FrappeField>
              ) : null}
              {!notesOnly ? (
                <>
                  <FrappeField label="Commission basis">
                    <SearchSelect
                      value={commissionBasis}
                      onValueChange={(v) =>
                        setCommissionBasis(v as CommissionBasis)
                      }
                      options={COMMISSION_BASIS_OPTIONS}
                      searchPlaceholder="Search commission basis…"
                    />
                  </FrappeField>
                  <FrappeField
                    label="Commission %"
                    hint={
                      commissionBasis === "SALES"
                        ? "Of sale subtotal · default 10%"
                        : "Of gross profit · default 10%"
                    }
                  >
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={commissionPercent}
                      onChange={(e) => setCommissionPercent(e.target.value)}
                      placeholder="10"
                    />
                  </FrappeField>
                </>
              ) : null}
              {canNegativeStock && !notesOnly ? (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Switch
                    id="allow-negative"
                    checked={allowNegativeStock}
                    onCheckedChange={setAllowNegativeStock}
                  />
                  <Label htmlFor="allow-negative">Allow negative stock</Label>
                </div>
              ) : null}
              <FrappeField label="Notes" fullWidth hint="Optional reference">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. customer PO"
                />
              </FrappeField>
            </FrappeFormGrid>
          </TabsContent>
        </Tabs>
      </FrappeDocument>

      <AlertDialog
        open={!!productionPrompt}
        onOpenChange={(open) => {
          if (!open) setProductionPrompt(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create draft production order?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Stock is short for items that can be manufactured. Create draft
                  production orders and continue this sale? Production managers
                  will be notified so they can release and start production.
                </p>
                {productionPrompt ? (
                  <ul className="list-disc space-y-1 pl-5 text-foreground">
                    {productionPrompt.suggestions.map((s) => (
                      <li key={`${s.itemId}-${s.bomId}`}>
                        <span className="font-medium">{s.itemDescription}</span>
                        {": need "}
                        {formatQty(s.quantityNeeded)}
                        {", available "}
                        {formatQty(s.available)}
                        {" — produce "}
                        {formatQty(s.shortage)}
                        {s.bomName ? ` (${s.bomName})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void confirmProductionAndSave();
              }}
            >
              {saving ? "Saving…" : "Create draft & save sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
