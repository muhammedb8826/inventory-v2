"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QuickSupplierDialog } from "@/components/suppliers/quick-supplier-dialog";
import { QuickLocationDialog } from "@/components/locations/quick-location-dialog";
import { QuickBankAccountDialog } from "@/components/banks/quick-bank-account-dialog";
import { QuickStockItemDialog } from "@/components/inventory/quick-stock-item-dialog";
import { withSelectCreateTrigger } from "@/components/shared/create-in-select";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import { SearchSelect } from "@/components/shared/search-select";
import { LineUomSelect } from "@/components/uom/line-uom-select";
import { Input } from "@/components/ui/input";
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
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { fetchInventoryForLocation } from "@/lib/inventory-fetch";
import { findDefaultLocationId } from "@/lib/inventory-defaults";
import { creditHasPayments, needsBankAccount } from "@/lib/document-utils";
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
import {
  buildItemOptionMap,
  itemOptionsFromMap,
  parseDocumentLines,
  productItemId,
  resolveItem,
  type DocumentLineBody,
} from "@/lib/inventory-items";
import { defaultUomIdForItem, fetchUoms, itemAllowsCuts } from "@/lib/uom";
import { errorMessage, formatMoney } from "@/lib/format";
import {
  PAYMENT_METHOD_OPTIONS,
  TAX_MODE_OPTIONS,
} from "@/lib/form-select-options";
import {
  fetchTaxDefaults,
  previewDocumentTax,
} from "@/lib/tax-settings";
import { fetchSuppliers, partySelectOptions } from "@/lib/party-fetch";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import type {
  BankAccount,
  Item,
  Location,
  PaymentMethod,
  Purchase,
  StockRecord,
  Supplier,
  TaxMode,
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

function linesFromPurchase(purchase: Purchase): LineRow[] {
  const rows = (purchase.lines ?? []).map((l) => {
    const itemId = productItemId({ itemId: l.itemId, item: l.item });
    const item = l.item ? resolveItem(itemId, l.item) : undefined;
    const isCut = Boolean(l.dimWidth || l.dimHeight);
    return {
      itemId,
      quantity: isCut && l.dimPieces ? String(l.dimPieces) : l.quantity,
      unitPrice: l.unitPrice,
      uomId: l.uomId ?? defaultUomIdForItem(item, "purchase") ?? "",
      item,
      width: l.dimWidth ?? "",
      height: l.dimHeight ?? "",
    };
  });
  return rows.length > 0 ? rows : [emptyLine()];
}

export function PurchaseForm({ purchase }: { purchase?: Purchase }) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = !!purchase?.id;
  const notesOnly = isEdit && creditHasPayments(purchase?.supplierCredit);
  const canTaxOverride = hasPermission(user, "purchase.tax");

  const [supplierId, setSupplierId] = useState(purchase?.supplierId ?? "");
  const [locationId, setLocationId] = useState(purchase?.locationId ?? "");
  const [itemQuery, setItemQuery] = useState("");
  const debouncedItemQuery = useDebouncedValue(itemQuery, 300);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    purchase?.paymentMethod ?? "CASH"
  );
  const [bankAccountId, setBankAccountId] = useState(
    purchase?.bankAccountId ?? ""
  );
  const [creditDueDate, setCreditDueDate] = useState(
    purchase?.creditDueDate?.slice(0, 10) ?? ""
  );
  const [notes, setNotes] = useState(purchase?.notes ?? "");
  const [taxPercent, setTaxPercent] = useState(() =>
    purchase?.taxPercent != null && purchase.taxPercent !== ""
      ? String(purchase.taxPercent)
      : ""
  );
  const [taxMode, setTaxMode] = useState<TaxMode>(
    () => purchase?.taxMode ?? "EXCLUSIVE"
  );
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [lines, setLines] = useState<LineRow[]>(() =>
    purchase ? linesFromPurchase(purchase) : [emptyLine()]
  );
  const [saving, setSaving] = useState(false);
  const { data: uomsData, loading: uomsLoading } = useFetch(
    () => fetchUoms(undefined, false),
    []
  );
  const uoms = uomsData ?? [];

  const {
    data: suppliers,
    loading: suppliersLoading,
    reload: reloadSuppliers,
    setData: setSuppliers,
  } = useFetch(() => fetchSuppliers(), []);
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

  useAutoPaymentAccount(
    paymentMethod,
    banks,
    bankAccountId,
    setBankAccountId
  );

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
    [...lines, ...(purchase?.lines ?? [])]
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

  const taxPreview = useMemo(() => {
    const pct = parseFloat(taxPercent);
    return previewDocumentTax(
      subtotal,
      Number.isNaN(pct) ? 0 : pct,
      taxMode,
      taxEnabled
    );
  }, [subtotal, taxPercent, taxMode, taxEnabled]);

  useEffect(() => {
    let cancelled = false;
    fetchTaxDefaults()
      .then((plan) => {
        if (cancelled) return;
        const active = plan.enabled && plan.applyToPurchases;
        setTaxEnabled(active);
        if (!isEdit) {
          setTaxPercent(String(plan.defaultPercent));
          setTaxMode(plan.defaultMode);
        } else if (
          purchase?.taxPercent == null ||
          purchase.taxPercent === ""
        ) {
          setTaxPercent(String(plan.defaultPercent));
          if (!purchase?.taxMode) setTaxMode(plan.defaultMode);
        }
      })
      .catch(() => {
        /* API applies plan on save */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, purchase?.id]);

  const supplierOptions = partySelectOptions(
    suppliers ?? [],
    supplierId,
    purchase?.supplier
  );
  const selectedSupplier = (suppliers ?? []).find((s) => s.id === supplierId);

  const dataLoading =
    (suppliers === null && suppliersLoading) ||
    (locations === null && locationsLoading) ||
    (banks === null && banksLoading);

  function onSupplierCreated(supplier: Supplier) {
    setSuppliers((prev) => [...(prev ?? []), supplier]);
    setSupplierId(supplier.id);
    reloadSuppliers();
  }

  function onLocationCreated(location: Location) {
    setLocations((prev) => [...(prev ?? []), location]);
    setLocationId(location.id);
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
      uomId: defaultUomIdForItem(item, "purchase") ?? "",
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
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      supplierId,
      locationId,
      paymentMethod,
      notes: notes || undefined,
      lines: documentLines,
    };
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
    if (canTaxOverride && taxPercent.trim()) {
      const pct = parseFloat(taxPercent);
      if (!Number.isNaN(pct) && pct >= 0 && pct <= 100) {
        body.taxPercent = pct;
        body.taxMode = taxMode;
      }
    }
    return body;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notesOnly && !supplierId) {
      toast.error("Supplier is required");
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
    let body: Record<string, unknown>;
    if (notesOnly) {
      body = { notes: notes || undefined };
    } else {
      const parsedLines = parseDocumentLines(lines);
      if ("error" in parsedLines) {
        toast.error(parsedLines.error);
        return;
      }
      body = buildBody(parsedLines.lines);
    }
    setSaving(true);
    try {
      if (isEdit && purchase) {
        await api<Purchase>(`/purchases/${purchase.id}`, {
          method: "PATCH",
          body,
        });
        toast.success("Purchase updated");
        router.push(`/purchases/${purchase.id}`);
      } else {
        const created = await api<Purchase>("/purchases", {
          method: "POST",
          body,
        });
        toast.success("Purchase recorded");
        requestNotificationsRefresh();
        router.push(`/purchases/${created.id}`);
      }
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

  const cancelHref =
    isEdit && purchase ? `/purchases/${purchase.id}` : "/purchases";
  const locationLabel =
    (locations ?? []).find((l) => l.id === locationId)?.name ?? null;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-0">
      <FrappeFormToolbar>
        <FrappeButtonPrimary type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save" : "Record purchase"}
        </FrappeButtonPrimary>
        <FrappeButtonLink href={cancelHref}>
          {isEdit ? "Back" : "Discard"}
        </FrappeButtonLink>
        {locationLabel ? (
          <span className="ml-auto hidden text-xs text-[var(--frappe-text-muted)] sm:inline">
            Receiving at {locationLabel}
          </span>
        ) : null}
      </FrappeFormToolbar>

      {notesOnly ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Supplier credit has payments — only notes can be changed.
        </div>
      ) : null}

      <FrappeDocument>
        <FrappeSection title="Supplier">
          <FrappeFormGrid columns={2}>
            <EntitySelectField
              label="Supplier"
              required={!notesOnly}
              fullWidth
              value={supplierId}
              onValueChange={setSupplierId}
              options={supplierOptions}
              searchPlaceholder="Search by name, phone, or email…"
              listHref="/suppliers"
              listLabel="All suppliers"
              emptyMessage="Create a supplier to record this purchase."
              quickCreate={
                notesOnly ? undefined : (
                  <QuickSupplierDialog onCreated={onSupplierCreated} />
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
            {selectedSupplier ? (
              <FrappeField label="Contact" fullWidth>
                <div className="rounded-md border border-[var(--frappe-border)] bg-[var(--frappe-section-head)]/40 px-3 py-2 text-sm text-[var(--frappe-text)]">
                  <div className="font-medium">{selectedSupplier.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--frappe-text-muted)]">
                    {[selectedSupplier.phone, selectedSupplier.email]
                      .filter(Boolean)
                      .join(" · ") || "No phone or email on this supplier"}
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
                Line items are locked because this credit purchase has payments.
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
                      line.item?.purchaseUom ||
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
                      line.itemId && !Number.isNaN(price) && price >= 0
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
                                  defaultUomIdForItem(item, "purchase") ?? "",
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
                                ? "Set a receiving location under Other Info."
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
                  <div className="min-w-[12rem] space-y-1 text-right">
                    <div className="flex justify-between gap-6 text-sm tabular-nums text-[var(--frappe-text-muted)]">
                      <span>Subtotal</span>
                      <span>{formatMoney(subtotal)}</span>
                    </div>
                    {taxEnabled && taxPreview.taxAmount > 0 ? (
                      <div className="flex justify-between gap-6 text-sm tabular-nums text-[var(--frappe-text-muted)]">
                        <span>
                          Tax
                          {taxPercent.trim() ? ` (${taxPercent}%)` : ""}
                        </span>
                        <span>{formatMoney(taxPreview.taxAmount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-6 pt-1">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--frappe-text-muted)]">
                        Total
                      </span>
                      <span className="text-xl font-semibold tabular-nums text-[var(--frappe-text)]">
                        {formatMoney(taxPreview.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="other" className="mt-0 p-4 sm:p-5">
            <FrappeFormGrid columns={2}>
              <EntitySelectField
                label="Receiving location"
                required={!notesOnly}
                value={locationId}
                onValueChange={onLocationChange}
                options={(locations ?? []).map((l) => ({
                  id: l.id,
                  label: `${l.name} (${l.type})`,
                }))}
                listHref="/locations"
                listLabel="All locations"
                emptyMessage="Add a warehouse or showroom to receive stock."
                quickCreate={
                  notesOnly ? undefined : (
                    <QuickLocationDialog onCreated={onLocationCreated} />
                  )
                }
                disabled={notesOnly}
              />
              {!notesOnly ? (
                <>
                  <FrappeField
                    label="Tax mode"
                    hint={
                      !taxEnabled
                        ? "Tax disabled in Settings"
                        : canTaxOverride
                          ? "Company plan — override allowed"
                          : "From company plan (read-only)"
                    }
                  >
                    <SearchSelect
                      value={taxMode}
                      onValueChange={(v) => setTaxMode(v as TaxMode)}
                      options={TAX_MODE_OPTIONS}
                      searchPlaceholder="Search tax mode…"
                      disabled={!canTaxOverride || !taxEnabled}
                    />
                  </FrappeField>
                  <FrappeField
                    label="Tax %"
                    hint={
                      !taxEnabled
                        ? "Plan disabled — tax will be 0"
                        : taxMode === "INCLUSIVE"
                          ? "Included in line prices"
                          : "Added on top of subtotal"
                    }
                  >
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxEnabled ? taxPercent : "0"}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      placeholder="—"
                      disabled={!canTaxOverride || !taxEnabled}
                    />
                  </FrappeField>
                </>
              ) : null}
              <FrappeField label="Notes" fullWidth hint="Optional reference">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. supplier invoice #"
                />
              </FrappeField>
            </FrappeFormGrid>
          </TabsContent>
        </Tabs>
      </FrappeDocument>
    </form>
  );
}
