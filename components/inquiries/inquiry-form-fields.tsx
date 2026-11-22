"use client";

import { useMemo, useState } from "react";
import {
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeGridCell,
  FrappeGridRow,
  FrappeGridTable,
  FrappeSection,
} from "@/components/frappe";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import { QuickCustomerDialog } from "@/components/customers/quick-customer-dialog";
import type { InquiryItemOption } from "@/hooks/use-inquiry-form-options";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EMPTY_INQUIRY_LINE,
  contactPatchFromCustomer,
  inquiryFormSubtotal,
  type InquiryFormLine,
  type InquiryFormValues,
} from "@/lib/inquiries";
import { ITEM_TYPE_OPTIONS } from "@/lib/item-types";
import { formatMoney } from "@/lib/format";
import type { Customer, ItemType } from "@/lib/types";
import type { EntityOption } from "@/components/shared/entity-select-field";

const ALL_ITEM_TYPES = "__all__";

function lineAmount(line: InquiryFormLine): number | null {
  if (!line.itemId.trim() || !line.unitPrice.trim()) return null;
  const qty = parseFloat(line.quantity);
  const price = parseFloat(line.unitPrice);
  if (Number.isNaN(price) || price < 0) return null;
  return (Number.isNaN(qty) || qty <= 0 ? 1 : qty) * price;
}

export function InquiryFormFields({
  values,
  onChange,
  idPrefix = "inquiry",
  customerOptions,
  customers = [],
  itemOptions,
  onCustomerCreated,
}: {
  values: InquiryFormValues;
  onChange: (patch: Partial<InquiryFormValues>) => void;
  mode?: "create" | "edit";
  idPrefix?: string;
  customerOptions: EntityOption[];
  customers?: Customer[];
  itemOptions: InquiryItemOption[];
  onCustomerCreated: (customer: Customer) => void;
}) {
  const [itemTypeFilter, setItemTypeFilter] = useState<
    ItemType | typeof ALL_ITEM_TYPES
  >("FINISHED");

  const filteredItemOptions = useMemo(() => {
    const selectedIds = new Set(
      values.lines.map((l) => l.itemId).filter(Boolean)
    );
    const filtered =
      itemTypeFilter === ALL_ITEM_TYPES
        ? itemOptions
        : itemOptions.filter(
            (opt) =>
              opt.itemType === itemTypeFilter || selectedIds.has(opt.itemId)
          );
    return [...filtered].sort((a, b) => {
      const aFin = a.itemType === "FINISHED" ? 0 : 1;
      const bFin = b.itemType === "FINISHED" ? 0 : 1;
      if (aFin !== bFin) return aFin - bFin;
      return a.label.localeCompare(b.label);
    });
  }, [itemOptions, itemTypeFilter, values.lines]);

  const subtotal = inquiryFormSubtotal(values.lines);
  const hasCustomer = Boolean(values.customerId.trim());
  const selectedCustomer = customers.find((c) => c.id === values.customerId);

  function set<K extends keyof InquiryFormValues>(
    key: K,
    value: InquiryFormValues[K]
  ) {
    onChange({ [key]: value });
  }

  function updateLine(index: number, patch: Partial<InquiryFormLine>) {
    set(
      "lines",
      values.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line
      )
    );
  }

  function onCustomerChange(customerId: string) {
    if (!customerId) {
      onChange({ customerId: "" });
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    onChange({
      customerId,
      ...contactPatchFromCustomer(customer),
    });
  }

  return (
    <FrappeDocument>
      {/* Header — Odoo-style party / dates */}
      <FrappeSection title="Customer">
        <FrappeFormGrid columns={2}>
          <EntitySelectField
            label="Customer"
            fullWidth
            value={values.customerId}
            onValueChange={onCustomerChange}
            options={customerOptions}
            listHref="/customers"
            listLabel="View all customers"
            emptyMessage="No customers yet — create one from this list."
            quickCreate={
              <QuickCustomerDialog
                onCreated={(customer) => {
                  onCustomerCreated(customer);
                  onChange({
                    customerId: customer.id,
                    ...contactPatchFromCustomer(customer),
                  });
                }}
              />
            }
          />
          <FrappeField
            label="Expiration"
            hint="Required when status is Quotation"
          >
            <Input
              id={`${idPrefix}-valid-until`}
              type="date"
              value={values.validUntil}
              onChange={(e) => set("validUntil", e.target.value)}
            />
          </FrappeField>

          {hasCustomer ? (
            <FrappeField label="Contact" fullWidth>
              <div className="rounded-md border border-[var(--frappe-border)] bg-[var(--frappe-section-head)]/40 px-3 py-2 text-sm text-[var(--frappe-text)]">
                <div className="font-medium">
                  {values.contactName || selectedCustomer?.name || "—"}
                </div>
                <div className="mt-0.5 text-xs text-[var(--frappe-text-muted)]">
                  {[values.phone, values.email].filter(Boolean).join(" · ") ||
                    "No phone or email on this customer"}
                </div>
              </div>
            </FrappeField>
          ) : (
            <>
              <FrappeField label="Contact name" required>
                <Input
                  id={`${idPrefix}-name`}
                  required
                  value={values.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  placeholder="Walk-in name"
                />
              </FrappeField>
              <FrappeField label="Phone" required>
                <Input
                  id={`${idPrefix}-phone`}
                  type="tel"
                  required
                  placeholder="0911…"
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </FrappeField>
            </>
          )}
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
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            <span className="text-[11px] text-[var(--frappe-text-muted)]">
              Item type
            </span>
            <Select
              value={itemTypeFilter}
              onValueChange={(v) =>
                setItemTypeFilter(v as ItemType | typeof ALL_ITEM_TYPES)
              }
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ITEM_TYPES}>All types</SelectItem>
                {ITEM_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FrappeGridTable
            columns={[
              { key: "item", label: "Item" },
              { key: "qty", label: "Qty", className: "w-24" },
              { key: "rate", label: "Unit price", className: "w-32" },
              { key: "amount", label: "Amount", className: "w-28 text-right" },
            ]}
            onAddRow={() =>
              set("lines", [...values.lines, { ...EMPTY_INQUIRY_LINE }])
            }
            addLabel="Add a line"
          >
            {values.lines.length === 0 ? (
              <FrappeGridRow canRemove={false}>
                <FrappeGridCell>
                  <span className="text-xs text-[var(--frappe-text-muted)]">
                    No items yet — add at least one line.
                  </span>
                </FrappeGridCell>
                <FrappeGridCell>
                  <span className="text-xs text-[var(--frappe-text-muted)]">
                    —
                  </span>
                </FrappeGridCell>
                <FrappeGridCell>
                  <span className="text-xs text-[var(--frappe-text-muted)]">
                    —
                  </span>
                </FrappeGridCell>
                <FrappeGridCell>
                  <span className="text-xs text-[var(--frappe-text-muted)]">
                    —
                  </span>
                </FrappeGridCell>
              </FrappeGridRow>
            ) : (
              values.lines.map((line, index) => {
                const amount = lineAmount(line);
                return (
                  <FrappeGridRow
                    key={index}
                    canRemove={values.lines.length > 1}
                    onRemove={() =>
                      set(
                        "lines",
                        values.lines.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <FrappeGridCell>
                      <ItemSearchSelect
                        value={line.itemId}
                        onValueChange={(itemId) =>
                          updateLine(index, { itemId })
                        }
                        options={filteredItemOptions}
                        placeholder="Select item…"
                        searchPlaceholder="Search catalog…"
                        emptyMessage={
                          itemTypeFilter === ALL_ITEM_TYPES
                            ? "No items found."
                            : "No items for this type — try All types."
                        }
                      />
                    </FrappeGridCell>
                    <FrappeGridCell>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, { quantity: e.target.value })
                        }
                        className="h-8"
                      />
                    </FrappeGridCell>
                    <FrappeGridCell>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(index, { unitPrice: e.target.value })
                        }
                        placeholder="0.00"
                        className="h-8"
                      />
                    </FrappeGridCell>
                    <FrappeGridCell>
                      <div className="flex h-8 items-center justify-end text-sm tabular-nums text-[var(--frappe-text)]">
                        {amount != null ? formatMoney(amount) : "—"}
                      </div>
                    </FrappeGridCell>
                  </FrappeGridRow>
                );
              })
            )}
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
        </TabsContent>

        <TabsContent value="other" className="mt-0 p-4 sm:p-5">
          <FrappeFormGrid columns={2}>
            <FrappeField label="Reference" hint="Customer PO or external ref">
              <Input
                id={`${idPrefix}-reference`}
                value={values.reference}
                onChange={(e) => set("reference", e.target.value)}
                placeholder="e.g. PO-1042"
                maxLength={100}
              />
            </FrappeField>
          </FrappeFormGrid>
        </TabsContent>
      </Tabs>
    </FrappeDocument>
  );
}
