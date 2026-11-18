"use client";

import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPTY_INQUIRY_LINE,
  INQUIRY_PRIORITIES,
  INQUIRY_STATUSES,
  contactPatchFromCustomer,
  inquiryStatusLabel,
  type InquiryFormLine,
  type InquiryFormValues,
} from "@/lib/inquiries";
import { ITEM_TYPE_OPTIONS } from "@/lib/item-types";
import type {
  Customer,
  InquiryPriority,
  InquiryStatus,
  ItemType,
} from "@/lib/types";
import type { EntityOption } from "@/components/shared/entity-select-field";

const ALL_ITEM_TYPES = "__all__";

export function InquiryFormFields({
  values,
  onChange,
  mode,
  inquiryId,
  idPrefix = "inquiry",
  customerOptions,
  customers = [],
  userOptions,
  itemOptions,
  onCustomerCreated,
}: {
  values: InquiryFormValues;
  onChange: (patch: Partial<InquiryFormValues>) => void;
  mode: "create" | "edit";
  /** Required in edit mode for Convert to sale. */
  inquiryId?: string | null;
  idPrefix?: string;
  customerOptions: EntityOption[];
  /** Full customer rows for contact prefill when linking a customer. */
  customers?: Customer[];
  userOptions: EntityOption[];
  itemOptions: InquiryItemOption[];
  onCustomerCreated: (customer: Customer) => void;
}) {
  /** Inquiries default to finished goods (what customers ask for). */
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemType | typeof ALL_ITEM_TYPES>(
    "FINISHED"
  );

  const filteredItemOptions = useMemo(() => {
    const selectedIds = new Set(
      values.lines.map((l) => l.itemId).filter(Boolean)
    );
    if (itemTypeFilter === ALL_ITEM_TYPES) return itemOptions;
    return itemOptions.filter(
      (opt) =>
        opt.itemType === itemTypeFilter || selectedIds.has(opt.itemId)
    );
  }, [itemOptions, itemTypeFilter, values.lines]);

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
    const customer = customers.find((c) => c.id === customerId);
    onChange({
      customerId,
      ...contactPatchFromCustomer(customer, values),
    });
  }

  const canConvert =
    mode === "edit" &&
    values.status !== "CANCELLED" &&
    values.status !== "CONVERTED" &&
    !values.convertedSaleId.trim();

  return (
    <FrappeDocument>
      <FrappeSection
        title="Party"
        description="Link a customer when known; contact details stay on the inquiry for walk-ins."
      >
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
                    ...contactPatchFromCustomer(customer, values),
                  });
                }}
              />
            }
          />
          <FrappeField
            label="Company"
            hint="Organization name (optional). Prefills from customer when empty."
          >
            <Input
              id={`${idPrefix}-company`}
              value={values.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="e.g. Acme Trading"
            />
          </FrappeField>
          <FrappeField label="Contact name" required>
            <Input
              id={`${idPrefix}-name`}
              required
              value={values.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </FrappeField>
          <FrappeField label="Phone">
            <Input
              id={`${idPrefix}-phone`}
              type="tel"
              placeholder="0911…"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FrappeField>
          <FrappeField label="Email">
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FrappeField>
        </FrappeFormGrid>
        <p className="mt-3 text-[11px] text-[var(--frappe-text-muted)]">
          Include at least a phone number or email so the team can follow up.
        </p>
      </FrappeSection>

      <FrappeSection title="Request">
        <FrappeFormGrid columns={2}>
          <FrappeField label="Subject" required fullWidth>
            <Input
              id={`${idPrefix}-subject`}
              required
              value={values.subject}
              onChange={(e) => set("subject", e.target.value)}
            />
          </FrappeField>
          <FrappeField label="Message" required fullWidth>
            <Textarea
              id={`${idPrefix}-message`}
              required
              rows={4}
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </FrappeField>
          <FrappeField
            label="Required by"
            hint="When the customer needs a decision / delivery (optional)."
          >
            <Input
              id={`${idPrefix}-required-by`}
              type="date"
              value={values.requiredByAt}
              onChange={(e) => set("requiredByAt", e.target.value)}
            />
          </FrappeField>
          <FrappeField
            label="Follow-up"
            hint="Internal reminder to contact them again."
          >
            <Input
              id={`${idPrefix}-follow-up`}
              type="datetime-local"
              value={values.followUpAt}
              onChange={(e) => set("followUpAt", e.target.value)}
            />
          </FrappeField>
        </FrappeFormGrid>
      </FrappeSection>

      <FrappeSection
        title="Interested items"
        description="Optional catalog lines for this RFQ. Defaults to finished goods — change the filter to see other types."
      >
        <div className="mb-3 flex max-w-xs flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--frappe-text-muted)]">
            Show item type
          </label>
          <Select
            value={itemTypeFilter}
            onValueChange={(v) =>
              setItemTypeFilter(v as ItemType | typeof ALL_ITEM_TYPES)
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FINISHED">Finished good</SelectItem>
              {ITEM_TYPE_OPTIONS.filter((o) => o.value !== "FINISHED").map(
                (option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                )
              )}
              <SelectItem value={ALL_ITEM_TYPES}>All types</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FrappeGridTable
          columns={[
            { key: "item", label: "Item" },
            { key: "qty", label: "Qty", className: "w-24" },
            { key: "notes", label: "Notes", className: "w-40" },
          ]}
          onAddRow={() =>
            set("lines", [...values.lines, { ...EMPTY_INQUIRY_LINE }])
          }
          addLabel="Add item"
        >
          {values.lines.length === 0 ? (
            <FrappeGridRow canRemove={false}>
              <FrappeGridCell>
                <span className="text-xs text-[var(--frappe-text-muted)]">
                  No items — add a line or leave blank.
                </span>
              </FrappeGridCell>
              <FrappeGridCell>
                <span className="text-xs text-[var(--frappe-text-muted)]">—</span>
              </FrappeGridCell>
              <FrappeGridCell>
                <span className="text-xs text-[var(--frappe-text-muted)]">—</span>
              </FrappeGridCell>
            </FrappeGridRow>
          ) : (
            values.lines.map((line, index) => (
              <FrappeGridRow
                key={index}
                canRemove
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
                    onValueChange={(itemId) => updateLine(index, { itemId })}
                    options={filteredItemOptions}
                    placeholder="Select finished good…"
                    searchPlaceholder="Search catalog…"
                    emptyMessage={
                      itemTypeFilter === "FINISHED"
                        ? "No finished goods found. Change the type filter or create a finished item."
                        : "No items found for this type."
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
                    value={line.notes}
                    onChange={(e) =>
                      updateLine(index, { notes: e.target.value })
                    }
                    placeholder="Optional"
                    className="h-8"
                  />
                </FrappeGridCell>
              </FrappeGridRow>
            ))
          )}
        </FrappeGridTable>
      </FrappeSection>

      <FrappeSection title="Assignment">
        <FrappeFormGrid columns={2} className="gap-5">
          <FrappeField label="Priority">
            <Select
              value={values.priority}
              onValueChange={(v) => set("priority", v as InquiryPriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INQUIRY_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FrappeField>
          <EntitySelectField
            label="Assign to"
            fullWidth
            value={values.assignedToUserId}
            onValueChange={(id) => set("assignedToUserId", id)}
            options={userOptions}
            listHref="/users"
            listLabel="View all users"
            emptyMessage="No users"
          />
          <FrappeField label="Internal notes" fullWidth>
            <Textarea
              id={`${idPrefix}-notes`}
              rows={3}
              value={values.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
              placeholder="Staff-only notes"
            />
          </FrappeField>
        </FrappeFormGrid>
      </FrappeSection>

      {mode === "edit" ? (
        <FrappeSection
          title="Workflow"
          description="Advance the pipeline, or convert to a sales invoice when ready."
        >
          <FrappeFormGrid columns={2}>
            <FrappeField label="Status">
              <Select
                value={values.status}
                onValueChange={(v) => set("status", v as InquiryStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INQUIRY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {inquiryStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FrappeField>
            <FrappeField label="Sale">
              {values.convertedSaleId.trim() ? (
                <div className="flex h-9 items-center gap-3">
                  <Link
                    href={`/sales/${values.convertedSaleId.trim()}`}
                    className="text-sm text-[var(--frappe-primary)] hover:underline"
                  >
                    Open linked sale
                  </Link>
                </div>
              ) : canConvert && inquiryId ? (
                <Button asChild variant="outline" className="h-8 text-xs">
                  <Link href={`/sales/new?inquiryId=${inquiryId}`}>
                    Convert to sale
                  </Link>
                </Button>
              ) : (
                <span className="text-xs text-[var(--frappe-text-muted)]">
                  Not converted
                </span>
              )}
            </FrappeField>
          </FrappeFormGrid>
        </FrappeSection>
      ) : null}
    </FrappeDocument>
  );
}
