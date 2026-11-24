import { api } from "@/lib/api";
import type {
  CommissionDefaults,
  CommissionSettings,
  UpdateCommissionSettingsBody,
} from "@/lib/types";

export async function fetchCommissionDefaults(): Promise<CommissionDefaults> {
  return api<CommissionDefaults>("/settings/commission/defaults");
}

export async function fetchCommissionSettings(): Promise<CommissionSettings> {
  return api<CommissionSettings>("/settings/commission");
}

export async function updateCommissionSettings(
  body: UpdateCommissionSettingsBody
): Promise<CommissionSettings> {
  return api<CommissionSettings>("/settings/commission", {
    method: "PATCH",
    body,
  });
}
