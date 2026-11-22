import type {
  CreateInquiryBody,
  Customer,
  Inquiry,
  InquiryAssignmentStatus,
  InquiryLine,
  InquiryLineInput,
  InquiryPriority,
  InquirySource,
  InquiryStatus,
  UpdateInquiryBody,
} from "@/lib/types";

export const INQUIRY_STATUSES: InquiryStatus[] = [
  "DRAFT",
  "QUOTED",
  "ORDERED",
  "LOST",
  "CANCELLED",
];

/** Statuses staff can set on the form (Ordered / Cancelled are system-driven). */
export const INQUIRY_EDITABLE_STATUSES: InquiryStatus[] = [
  "DRAFT",
  "QUOTED",
  "LOST",
];

/** Happy-path quotation pipeline shown in the status stepper. */
export const INQUIRY_PIPELINE_STATUSES: InquiryStatus[] = [
  "DRAFT",
  "QUOTED",
  "ORDERED",
];

/**
 * Which pipeline steps a user may click.
 * Ordered is allowed from Quotation — same action as convert to sale.
 */
export function inquiryStatusStepClickable(
  current: InquiryStatus,
  target: InquiryStatus,
  opts?: { canOrder?: boolean }
): boolean {
  if (current === "ORDERED" || current === "CANCELLED") return false;
  if (target === current) return false;
  if (target === "ORDERED") {
    return current === "QUOTED" && opts?.canOrder !== false;
  }
  if (target === "DRAFT" || target === "QUOTED") {
    return current === "DRAFT" || current === "QUOTED" || current === "LOST";
  }
  if (target === "LOST") {
    return current === "DRAFT" || current === "QUOTED";
  }
  return false;
}

export const INQUIRY_PRIORITIES: InquiryPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export const INQUIRY_ASSIGNMENT_STATUSES: InquiryAssignmentStatus[] = [
  "UNASSIGNED",
  "PENDING",
  "ACCEPTED",
  "DECLINED",
];

export interface InquiryFormLine {
  itemId: string;
  quantity: string;
  unitPrice: string;
  notes: string;
}

export interface InquiryFormValues {
  contactName: string;
  companyName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  priority: InquiryPriority;
  customerId: string;
  assignedToUserId: string;
  lines: InquiryFormLine[];
  internalNotes: string;
  followUpAt: string;
  requiredByAt: string;
  validUntil: string;
  quoteTerms: string;
  reference: string;
  status: InquiryStatus;
  /** Read-only link after convert — not edited as a raw UUID. */
  convertedSaleId: string;
}

export const EMPTY_INQUIRY_LINE: InquiryFormLine = {
  itemId: "",
  quantity: "1",
  unitPrice: "",
  notes: "",
};

export const EMPTY_INQUIRY_FORM: InquiryFormValues = {
  contactName: "",
  companyName: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
  priority: "NORMAL",
  customerId: "",
  assignedToUserId: "",
  lines: [{ ...EMPTY_INQUIRY_LINE }],
  internalNotes: "",
  followUpAt: "",
  requiredByAt: "",
  validUntil: "",
  quoteTerms: "",
  reference: "",
  status: "DRAFT",
  convertedSaleId: "",
};

/** Document status — ERP quotation wording. */
export function inquiryStatusLabel(status: InquiryStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "QUOTED":
      return "Quotation";
    case "ORDERED":
      return "Ordered";
    case "LOST":
      return "Lost";
    case "CANCELLED":
      return "Cancelled";
  }
}

/** Ownership — who is responsible (not the document status). */
export function inquiryAssignmentLabel(
  status?: InquiryAssignmentStatus | null
): string {
  switch (status) {
    case "PENDING":
      return "Awaiting accept";
    case "ACCEPTED":
      return "Assigned";
    case "DECLINED":
      return "Declined";
    case "UNASSIGNED":
    default:
      return "Unassigned";
  }
}

export function inquiryPriorityLabel(priority: InquiryPriority): string {
  switch (priority) {
    case "LOW":
      return "Low";
    case "HIGH":
      return "High";
    case "URGENT":
      return "Urgent";
    case "NORMAL":
    default:
      return "Normal";
  }
}

export function inquirySourceLabel(source: InquirySource): string {
  switch (source) {
    case "PUBLIC":
      return "Website";
    case "INTERNAL":
      return "Walk-in";
  }
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function inquiryLinesFromRecord(inquiry: Inquiry): InquiryFormLine[] {
  const apiLines = inquiry.lines ?? [];
  if (apiLines.length > 0) {
    return apiLines.map((line) => ({
      itemId: line.itemId ?? line.item?.id ?? "",
      quantity:
        line.quantity != null && String(line.quantity).trim() !== ""
          ? String(Number(line.quantity))
          : "1",
      unitPrice:
        line.unitPrice != null && String(line.unitPrice).trim() !== ""
          ? String(Number(line.unitPrice))
          : "",
      notes: line.notes ?? "",
    }));
  }
  if (inquiry.itemId || inquiry.item?.id) {
    return [
      {
        itemId: inquiry.itemId ?? inquiry.item?.id ?? "",
        quantity: "1",
        unitPrice: "",
        notes: "",
      },
    ];
  }
  return [];
}

export function inquiryToFormValues(inquiry: Inquiry): InquiryFormValues {
  return {
    contactName: inquiry.contactName ?? "",
    companyName: inquiry.companyName ?? "",
    phone: inquiry.phone ?? "",
    email: inquiry.email ?? "",
    subject: inquiry.subject ?? "",
    message: inquiry.message ?? "",
    priority: inquiry.priority ?? "NORMAL",
    customerId: inquiry.customerId ?? "",
    assignedToUserId: inquiry.assignedToUserId ?? "",
    lines: inquiryLinesFromRecord(inquiry),
    internalNotes: inquiry.internalNotes ?? "",
    followUpAt: toDatetimeLocal(inquiry.followUpAt),
    requiredByAt: toDateInput(inquiry.requiredByAt),
    validUntil: toDateInput(inquiry.validUntil),
    quoteTerms: inquiry.quoteTerms ?? "",
    reference: inquiry.reference ?? "",
    status: inquiry.status,
    convertedSaleId: inquiry.convertedSaleId ?? "",
  };
}

/** Copy contact snapshot from a linked customer onto the inquiry. */
export function contactPatchFromCustomer(
  customer: Customer | null | undefined,
  _current?: Pick<
    InquiryFormValues,
    "contactName" | "phone" | "email" | "companyName"
  >
): Partial<InquiryFormValues> {
  if (!customer) return {};
  return {
    contactName: customer.name?.trim() || "",
    companyName: customer.name?.trim() || "",
    phone: customer.phone?.trim() || "",
    email: customer.email?.trim() || "",
  };
}

export function validateInquiryContact(values: InquiryFormValues): string | null {
  const hasCustomer = Boolean(values.customerId.trim());
  if (hasCustomer) {
    if (!values.contactName.trim()) {
      return "Selected customer has no name";
    }
    if (!values.phone.trim() && !values.email.trim()) {
      return "Selected customer needs a phone or email — update the customer record";
    }
  } else {
    if (!values.contactName.trim()) {
      return "Contact name is required for walk-ins";
    }
    if (!values.phone.trim()) {
      return "Phone is required for walk-ins";
    }
  }
  if (!values.lines.some((l) => l.itemId.trim())) {
    return "Add at least one item";
  }
  return null;
}

/** Client-side check before saving as Quoted. */
export function validateInquiryQuote(values: InquiryFormValues): string | null {
  if (values.status !== "QUOTED") return null;
  const priced = values.lines.filter((l) => l.itemId.trim());
  if (priced.length === 0) {
    return "Add at least one item with a unit price before marking as Quoted";
  }
  for (const line of priced) {
    const price = parseFloat(line.unitPrice);
    if (Number.isNaN(price) || price < 0) {
      return "Set a unit price on every line before marking as Quoted";
    }
  }
  if (!values.validUntil.trim()) {
    return "Set Valid until (quote expiry) before marking as Quoted";
  }
  return null;
}

export function inquiryFormSubtotal(lines: InquiryFormLine[]): number {
  let sum = 0;
  for (const line of lines) {
    if (!line.itemId.trim()) continue;
    const qty = parseFloat(line.quantity);
    const price = parseFloat(line.unitPrice);
    if (Number.isNaN(price) || price < 0) continue;
    sum += (Number.isNaN(qty) || qty <= 0 ? 1 : qty) * price;
  }
  return sum;
}

export function buildInquiryLinePayload(
  lines: InquiryFormLine[]
): InquiryLineInput[] | undefined {
  const parsed: InquiryLineInput[] = [];
  for (const line of lines) {
    const itemId = line.itemId.trim();
    if (!itemId) continue;
    const qty = parseFloat(line.quantity);
    const payload: InquiryLineInput = { itemId };
    if (!Number.isNaN(qty) && qty > 0) payload.quantity = qty;
    const price = parseFloat(line.unitPrice);
    if (!Number.isNaN(price) && price >= 0 && line.unitPrice.trim() !== "") {
      payload.unitPrice = price;
    }
    const notes = optionalString(line.notes);
    if (notes) payload.notes = notes;
    parsed.push(payload);
  }
  return parsed.length > 0 ? parsed : undefined;
}

export function buildCreateInquiryBody(
  values: InquiryFormValues
): CreateInquiryBody {
  const body: CreateInquiryBody = {
    contactName: values.contactName.trim(),
    phone: optionalString(values.phone),
    email: optionalString(values.email),
    companyName: optionalString(values.companyName),
    priority: values.priority,
    customerId: optionalString(values.customerId),
    internalNotes: optionalString(values.internalNotes),
    followUpAt: optionalString(values.followUpAt)
      ? new Date(values.followUpAt).toISOString()
      : undefined,
    requiredByAt: optionalString(values.requiredByAt)
      ? new Date(values.requiredByAt).toISOString()
      : undefined,
    validUntil: optionalString(values.validUntil)
      ? new Date(values.validUntil).toISOString()
      : undefined,
    quoteTerms: optionalString(values.quoteTerms),
    reference: optionalString(values.reference),
  };
  const lines = buildInquiryLinePayload(values.lines);
  if (lines) body.lines = lines;
  return body;
}

export function buildUpdateInquiryBody(
  values: InquiryFormValues
): UpdateInquiryBody {
  return {
    contactName: values.contactName.trim(),
    companyName: emptyToNull(values.companyName),
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
    status: values.status,
    priority: values.priority,
    customerId: emptyToNull(values.customerId),
    lines: buildInquiryLinePayload(values.lines) ?? [],
    internalNotes: emptyToNull(values.internalNotes),
    followUpAt: values.followUpAt
      ? new Date(values.followUpAt).toISOString()
      : null,
    requiredByAt: values.requiredByAt
      ? new Date(values.requiredByAt).toISOString()
      : null,
    validUntil: values.validUntil
      ? new Date(values.validUntil).toISOString()
      : null,
    quoteTerms: emptyToNull(values.quoteTerms),
    reference: emptyToNull(values.reference),
  };
}

export function inquiryItemsSummary(inquiry: Inquiry): string {
  const lines: InquiryLine[] = inquiry.lines ?? [];
  if (lines.length > 0) {
    return lines
      .map((line) => {
        const name = line.item?.description ?? line.item?.sku ?? "Item";
        const qty =
          line.quantity != null && String(line.quantity).trim() !== ""
            ? ` × ${Number(line.quantity)}`
            : "";
        return `${name}${qty}`;
      })
      .join(", ");
  }
  if (inquiry.item?.description) return inquiry.item.description;
  return "—";
}
