"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import {
  AppDialogBody,
  AppDialogContent,
  AppDialogFooter,
  AppDialogHeader,
} from "@/components/shared/app-dialog-shell";

/**
 * Quick-create fields rendered inside a full-page form (e.g. purchase/sale).
 * Uses a div instead of nested <form> so the parent form is not submitted.
 */
export function QuickCreateDialogShell({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="sm">
        <AppDialogHeader title={title} />
        <AppDialogBody className="p-0">{children}</AppDialogBody>
        <AppDialogFooter>{footer}</AppDialogFooter>
      </AppDialogContent>
    </Dialog>
  );
}

export type QuickCreateDialogControl = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function useQuickCreateDialog(control?: QuickCreateDialogControl) {
  const [uncontrolled, setUncontrolled] = React.useState(false);
  const controlled = control?.open !== undefined;
  const open = controlled ? Boolean(control.open) : uncontrolled;
  const onOpenChangeProp = control?.onOpenChange;

  const onOpenChange = React.useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next);
      onOpenChangeProp?.(next);
    },
    [controlled, onOpenChangeProp]
  );

  return { open, setOpen: onOpenChange, onOpenChange };
}

/** `trigger={null}` hides the default button (host / select-footer controlled open). */
export function bindQuickCreateTrigger(
  trigger: React.ReactNode | null | undefined,
  openDialog: () => void,
  fallback: React.ReactNode
) {
  if (trigger === null) return null;
  if (trigger) {
    if (React.isValidElement<{ onClick?: React.MouseEventHandler }>(trigger)) {
      return React.cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e);
          if (!e.defaultPrevented) openDialog();
        },
      });
    }
    return trigger;
  }
  return fallback;
}
