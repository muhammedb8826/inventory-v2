import type {
  CreateInquiryBody,
  Inquiry,
  InquiryPriority,
  InquiryStatus,
  UpdateInquiryBody,
} from "@/lib/types";

export const INQUIRY_STATUSES: InquiryStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "QUOTED",
  "CONVERTED",
  "CLOSED",
  "CANCELLED",
];

export const INQUIRY_PRIORITIES: InquiryPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export interface InquiryFormValues {
  contactName: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  priority: InquiryPriority;
  customerId: string;
  assignedToUserId: string;
  itemId: string;
  internalNotes: string;
  followUpAt: string;
  status: InquiryStatus;
  convertedSaleId: string;
}

export const EMPTY_INQUIRY_FORM: InquiryFormValues = {
  contactName: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
  priority: "NORMAL",
  customerId: "",
  assignedToUserId: "",
  itemId: "",
  internalNotes: "",
  followUpAt: "",
  status: "NEW",
  convertedSaleId: "",
};

export function inquiryStatusLabel(status: InquiryStatus): string {
  return status.replaceAll("_", " ");
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

export function inquiryToFormValues(inquiry: Inquiry): InquiryFormValues {
  return {
    contactName: inquiry.contactName ?? "",
    phone: inquiry.phone ?? "",
    email: inquiry.email ?? "",
    subject: inquiry.subject ?? "",
    message: inquiry.message ?? "",
    priority: inquiry.priority ?? "NORMAL",
    customerId: inquiry.customerId ?? "",
    assignedToUserId: inquiry.assignedToUserId ?? "",
    itemId: inquiry.itemId ?? "",
    internalNotes: inquiry.internalNotes ?? "",
    followUpAt: toDatetimeLocal(inquiry.followUpAt),
    status: inquiry.status,
    convertedSaleId: inquiry.convertedSaleId ?? "",
  };
}

export function validateInquiryContact(values: InquiryFormValues): string | null {
  if (!values.phone.trim() && !values.email.trim()) {
    return "Provide at least a phone number or email";
  }
  return null;
}

export function buildCreateInquiryBody(
  values: InquiryFormValues
): CreateInquiryBody {
  return {
    contactName: values.contactName.trim(),
    subject: values.subject.trim(),
    message: values.message.trim(),
    phone: optionalString(values.phone),
    email: optionalString(values.email),
    priority: values.priority,
    customerId: optionalString(values.customerId),
    assignedToUserId: optionalString(values.assignedToUserId),
    itemId: optionalString(values.itemId),
    internalNotes: optionalString(values.internalNotes),
    followUpAt: optionalString(values.followUpAt)
      ? new Date(values.followUpAt).toISOString()
      : undefined,
  };
}

export function buildUpdateInquiryBody(
  values: InquiryFormValues
): UpdateInquiryBody {
  return {
    contactName: values.contactName.trim(),
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
    subject: values.subject.trim(),
    message: values.message.trim(),
    status: values.status,
    priority: values.priority,
    customerId: emptyToNull(values.customerId),
    assignedToUserId: emptyToNull(values.assignedToUserId),
    itemId: emptyToNull(values.itemId),
    internalNotes: emptyToNull(values.internalNotes),
    followUpAt: values.followUpAt
      ? new Date(values.followUpAt).toISOString()
      : null,
    convertedSaleId: emptyToNull(values.convertedSaleId),
  };
}
