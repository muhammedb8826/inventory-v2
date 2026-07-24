"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { INQUIRY_PRIORITIES, optionalString } from "@/lib/inquiries";
import { errorMessage } from "@/lib/format";
import { fetchAllInventory, uniqueItemsFromStock } from "@/lib/inventory-fetch";
import type {
  CreateInquiryBody,
  Customer,
  Inquiry,
  InquiryPriority,
  UserAdmin,
} from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

export function InquiryCreateDialog({
  onSuccess,
}: {
  onSuccess: (inquiry?: Inquiry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<InquiryPriority>("NORMAL");
  const [customerId, setCustomerId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [itemId, setItemId] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);

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

  function reset() {
    setContactName("");
    setPhone("");
    setEmail("");
    setSubject("");
    setMessage("");
    setPriority("NORMAL");
    setCustomerId("");
    setAssignedToUserId("");
    setItemId("");
    setInternalNotes("");
    setFollowUpAt("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() && !email.trim()) {
      toast.error("Provide at least a phone number or email");
      return;
    }

    setSaving(true);
    try {
      const body: CreateInquiryBody = {
        contactName: contactName.trim(),
        subject: subject.trim(),
        message: message.trim(),
        phone: optionalString(phone),
        email: optionalString(email),
        priority,
        customerId: optionalString(customerId),
        assignedToUserId: optionalString(assignedToUserId),
        itemId: optionalString(itemId),
        internalNotes: optionalString(internalNotes),
        followUpAt: optionalString(followUpAt)
          ? new Date(followUpAt).toISOString()
          : undefined,
      };
      const created = await api<Inquiry>("/inquiries", {
        method: "POST",
        body,
      });
      toast.success("Inquiry created");
      setOpen(false);
      reset();
      onSuccess(created);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          New inquiry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-[var(--frappe-border)] px-4 py-3">
          <DialogTitle>New inquiry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inquiry-name">Contact name</Label>
              <Input
                id="inquiry-name"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry-phone">Phone</Label>
              <Input
                id="inquiry-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0911…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inquiry-email">Email</Label>
              <Input
                id="inquiry-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inquiry-subject">Subject</Label>
              <Input
                id="inquiry-subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inquiry-message">Message</Label>
              <Textarea
                id="inquiry-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
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
              <Label htmlFor="inquiry-follow-up">Follow-up</Label>
              <Input
                id="inquiry-follow-up"
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
              />
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
            <Label htmlFor="inquiry-notes">Internal notes</Label>
            <Textarea
              id="inquiry-notes"
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 border-t border-[var(--frappe-border)] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
