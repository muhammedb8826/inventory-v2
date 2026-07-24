import type { InquiryPriority, InquiryStatus } from "@/lib/types";

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
