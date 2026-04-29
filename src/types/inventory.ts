export type InventoryStatus = "AMAN" | "WARNING" | "KRITIS";

export interface InventoryItem {
  inventory_item_id: number;
  name: string;
  unit: string;
  stock_current: number;
  safe_min_qty: number;
  warning_min_qty: number;
  warning_max_qty: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  stock_status: InventoryStatus;
}