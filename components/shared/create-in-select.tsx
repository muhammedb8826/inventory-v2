"use client";

import * as React from "react";
import { QuickCreateInlineTrigger } from "@/components/shared/quick-create-trigger";

type HostEntry = {
  id: string;
  node: React.ReactNode;
};

let hostEntries: HostEntry[] = [];
const hostListeners = new Set<() => void>();

function emitHost() {
  hostListeners.forEach((listener) => listener());
}

function pushHostEntry(node: React.ReactNode): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `create-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  hostEntries = [...hostEntries, { id, node }];
  emitHost();
  return id;
}

function removeHostEntry(id: string) {
  hostEntries = hostEntries.filter((entry) => entry.id !== id);
  emitHost();
}

/**
 * Mount once near the app root. Holds quick-create dialogs opened from
 * SearchSelect footers so closing the popover does not unmount the modal.
 */
export function CreateInSelectHost() {
  const [entries, setEntries] = React.useState<HostEntry[]>(hostEntries);

  React.useEffect(() => {
    const sync = () => setEntries([...hostEntries]);
    hostListeners.add(sync);
    sync();
    return () => {
      hostListeners.delete(sync);
    };
  }, []);

  if (entries.length === 0) return null;
  return (
    <>
      {entries.map((entry) => (
        <React.Fragment key={entry.id}>{entry.node}</React.Fragment>
      ))}
    </>
  );
}

/** Dropdown-footer trigger label row. */
export function quickCreateSelectTrigger(
  onClick: () => void,
  label: string,
  disabled?: boolean
) {
  return (
    <QuickCreateInlineTrigger
      label={label}
      disabled={disabled}
      className="flex w-full items-center gap-1.5 px-1 py-1 text-left text-sm disabled:opacity-50"
      onPointerDown={(e) => {
        // Keep the select from treating this as an outside dismiss mid-click.
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
    />
  );
}

type QuickCreateDialogElement = React.ReactElement<{
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}>;

/**
 * Footer control: closes the select, then mounts the create dialog on the
 * app-level host (survives popover unmount).
 */
export function withSelectCreateTrigger(
  dialog: QuickCreateDialogElement,
  close: () => void,
  label: string,
  disabled?: boolean
) {
  return quickCreateSelectTrigger(
    () => {
      close();
      const id = pushHostEntry(
        React.cloneElement(dialog, {
          trigger: null,
          open: true,
          onOpenChange: (next: boolean) => {
            if (!next) removeHostEntry(id);
          },
        })
      );
    },
    label,
    disabled
  );
}
