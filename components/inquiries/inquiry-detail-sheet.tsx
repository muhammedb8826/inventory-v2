"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { QuickCustomerDialog } from "@/components/customers/quick-customer-dialog";
import {
  InquiryPriorityBadge,
  InquirySourceBadge,
  InquiryStatusBadge,
} from "@/components/inquiries/inquiry-status-badge";
import { PermissionGate } from "@/components/permission-gate";
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import {
  INQUIRY_PRIORITIES,
  INQUIRY_STATUSES,
  emptyToNull,
} from "@/lib/inquiries";
import { errorMessage, formatDate } from "@/lib/format";
import { fetchAllInventory, uniqueItemsFromStock } from "@/lib/inventory-fetch";
import type {
  Customer,
  Inquiry,
  InquiryPriority,
  InquiryStatus,
  UpdateInquiryBody,
  UserAdmin,
} from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";

function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function InquiryDetailSheet({
  inquiryId,
  open,
  onOpenChange,
  onChanged,
}: {
  inquiryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<InquiryStatus>("NEW");
  const [priority, setPriority] = useState<InquiryPriority>("NORMAL");
  const [customerId, setCustomerId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [itemId, setItemId] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [convertedSaleId, setConvertedSaleId] = useState("");

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

  const itemOptions = useMemo(
    () =>
      uniqueItemsFromStock(stock ?? []).map((item) => ({
        id: item.id,
        label: item.sku
          ? `${item.description} (${item.sku})`
          : item.description,
      })),
    [stock]
  );

  useEffect(() => {
    if (!open || !inquiryId) {
      setInquiry(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    api<Inquiry>(`/inquiries/${inquiryId}`)
      .then((row) => {
        if (cancelled) return;
        setInquiry(row);
        setContactName(row.contactName ?? "");
        setPhone(row.phone ?? "");
        setEmail(row.email ?? "");
        setSubject(row.subject ?? "");
        setMessage(row.message ?? "");
        setStatus(row.status);
        setPriority(row.priority ?? "NORMAL");
        setCustomerId(row.customerId ?? "");
        setAssignedToUserId(row.assignedToUserId ?? "");
        setItemId(row.itemId ?? "");
        setInternalNotes(row.internalNotes ?? "");
        setFollowUpAt(toDatetimeLocal(row.followUpAt));
        setConvertedSaleId(row.convertedSaleId ?? "");
      })
      .catch((err) => {
        if (!cancelled) toast.error(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, inquiryId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiryId) return;
    if (!phone.trim() && !email.trim()) {
      toast.error("Provide at least a phone number or email");
      return;
    }

    setSaving(true);
    try {
      const body: UpdateInquiryBody = {
        contactName: contactName.trim(),
        phone: emptyToNull(phone),
        email: emptyToNull(email),
        subject: subject.trim(),
        message: message.trim(),
        status,
        priority,
        customerId: emptyToNull(customerId),
        assignedToUserId: emptyToNull(assignedToUserId),
        itemId: emptyToNull(itemId),
        internalNotes: emptyToNull(internalNotes),
        followUpAt: followUpAt
          ? new Date(followUpAt).toISOString()
          : null,
        convertedSaleId: emptyToNull(convertedSaleId),
      };
      const updated = await api<Inquiry>(`/inquiries/${inquiryId}`, {
        method: "PATCH",
        body,
      });
      setInquiry(updated);
      toast.success("Inquiry updated");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!inquiryId || !inquiry) return;
    if (inquiry.status === "CONVERTED") {
      toast.error("Converted inquiries cannot be cancelled — close them instead");
      return;
    }
    if (!confirm("Cancel this inquiry?")) return;

    setCancelling(true);
    try {
      await api(`/inquiries/${inquiryId}`, { method: "DELETE" });
      toast.success("Inquiry cancelled");
      onOpenChange(false);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-[var(--frappe-border)]">
          <SheetTitle>Inquiry detail</SheetTitle>
          <SheetDescription>
            {inquiry ? (
              <span className="flex flex-wrap items-center gap-2 pt-1">
                <InquiryStatusBadge status={inquiry.status} />
                <InquiryPriorityBadge priority={inquiry.priority} />
                <InquirySourceBadge source={inquiry.source} />
                <span className="text-xs text-muted-foreground">
                  {formatDate(inquiry.createdAt)}
                </span>
              </span>
            ) : (
              "Loading…"
            )}
          </SheetDescription>
        </SheetHeader>

        {loading || !inquiry ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="detail-name">Contact name</Label>
                <Input
                  id="detail-name"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-phone">Phone</Label>
                <Input
                  id="detail-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-email">Email</Label>
                <Input
                  id="detail-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="detail-subject">Subject</Label>
                <Input
                  id="detail-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="detail-message">Message</Label>
                <Textarea
                  id="detail-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as InquiryStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INQUIRY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as InquiryPriority)}
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-follow-up">Follow-up</Label>
                <Input
                  id="detail-follow-up"
                  type="datetime-local"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="detail-sale">Converted sale ID</Label>
                <Input
                  id="detail-sale"
                  value={convertedSaleId}
                  onChange={(e) => setConvertedSaleId(e.target.value)}
                  placeholder="Sale UUID"
                />
                {convertedSaleId.trim() ? (
                  <Link
                    href={`/sales/${convertedSaleId.trim()}`}
                    className="text-xs text-[var(--frappe-primary)] hover:underline"
                  >
                    Open sale
                  </Link>
                ) : null}
              </div>
            </div>

            <EntitySelectField
              label="Customer"
              value={customerId}
              onValueChange={setCustomerId}
              options={customerOptions}
              listHref="/customers"
              listLabel="Customers"
              emptyMessage="No customers"
              stackedActions
              quickCreate={
                <QuickCustomerDialog
                  onCreated={(customer) => {
                    setCustomers((prev) => [...(prev ?? []), customer]);
                    setCustomerId(customer.id);
                    reloadCustomers();
                  }}
                />
              }
            />

            <EntitySelectField
              label="Assign to"
              value={assignedToUserId}
              onValueChange={setAssignedToUserId}
              options={userOptions}
              listHref="/users"
              listLabel="Users"
              emptyMessage="No users"
              stackedActions
            />

            <EntitySelectField
              label="Catalog item"
              value={itemId}
              onValueChange={setItemId}
              options={itemOptions}
              listHref="/inventory"
              listLabel="Inventory"
              emptyMessage="No items"
              stackedActions
            />

            <div className="space-y-2">
              <Label htmlFor="detail-notes">Internal notes</Label>
              <Textarea
                id="detail-notes"
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              />
            </div>

            <PermissionGate permission="inquiries.write">
              <SheetFooter className="flex-row flex-wrap gap-2 border-t border-[var(--frappe-border)] px-0 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                {inquiry.status !== "CANCELLED" &&
                inquiry.status !== "CONVERTED" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={cancelling}
                    onClick={() => void handleCancel()}
                  >
                    {cancelling ? "Cancelling…" : "Cancel inquiry"}
                  </Button>
                ) : null}
              </SheetFooter>
            </PermissionGate>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
