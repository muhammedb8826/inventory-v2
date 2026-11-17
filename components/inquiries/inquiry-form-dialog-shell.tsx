"use client";

import {
  AppDialogBody,
  AppDialogContent,
  AppDialogFooter,
  AppDialogHeader,
} from "@/components/shared/app-dialog-shell";

/** @deprecated Prefer AppDialog* — kept as aliases for inquiry imports. */
export const inquiryDialogContentClass = "";

export function InquiryFormDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AppDialogContent size="xl" className={className}>
      {children}
    </AppDialogContent>
  );
}

export function InquiryFormDialogHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return <AppDialogHeader title={title}>{children}</AppDialogHeader>;
}

export function InquiryFormDialogBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppDialogBody>{children}</AppDialogBody>;
}

export function InquiryFormDialogFooter({
  children,
  start,
}: {
  children: React.ReactNode;
  start?: React.ReactNode;
}) {
  return <AppDialogFooter start={start}>{children}</AppDialogFooter>;
}
