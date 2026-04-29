import type { InventoryItem, InventoryStatus } from "@/types/inventory";

export function getInventoryStatus(item: {
  stock_current: number;
  safe_min_qty: number;
  warning_min_qty: number;
  warning_max_qty: number;
}): InventoryStatus {
  const stock = Number(item.stock_current ?? 0);

  if (stock < item.warning_min_qty) return "KRITIS";
  if (stock <= item.warning_max_qty) return "WARNING";
  return "AMAN";
}

export function getInventoryStatusLabel(status: InventoryStatus): string {
  if (status === "AMAN") return "Aman";
  if (status === "WARNING") return "Warning";
  return "Kritis";
}

export function getInventoryStatusClass(status: InventoryStatus): string {
  if (status === "AMAN") {
    return "bg-emerald-500 text-white";
  }

  if (status === "WARNING") {
    return "bg-yellow-400 text-white";
  }

  return "bg-red-500 text-white";
}

export function summarizeInventory(items: InventoryItem[]) {
  const total = items.length;
  const lowStockItems = items.filter(
    (item) => item.stock_status === "WARNING" || item.stock_status === "KRITIS"
  );
  const criticalItems = items.filter((item) => item.stock_status === "KRITIS");

  return {
    total,
    lowStockCount: lowStockItems.length,
    criticalCount: criticalItems.length,
    lowStockPreview: lowStockItems.slice(0, 1)[0],
    criticalPreview: criticalItems.slice(0, 1)[0],
  };
}