"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, X, Database, Package, CircleAlert } from "lucide-react";
import OwnerPageShell from "@/components/owner/owner-page-shell";
import OwnerPageHeader from "@/components/owner/owner-page-header";

type InventoryStatus = "AMAN" | "WARNING" | "KRITIS";

interface InventoryItem {
  inventory_item_id: number;
  name: string;
  unit: string;
  stock_current: number;
  safe_min_qty: number;
  warning_min_qty: number;
  warning_max_qty: number;
  is_active: boolean;
  stock_status: InventoryStatus;
}

type ModalMode = "create" | "edit";

interface InventoryFormState {
  name: string;
  unit: string;
  stock_initial: string;
  stock_add: string;
  safe_min_qty: string;
  warning_min_qty: string;
  warning_max_qty: string;
}

const CREATE_FORM_DEFAULT: InventoryFormState = {
  name: "",
  unit: "",
  stock_initial: "",
  stock_add: "",
  safe_min_qty: "1500",
  warning_min_qty: "200",
  warning_max_qty: "1500",
};

function getStatusLabel(status: InventoryStatus) {
  if (status === "AMAN") return "Aman";
  if (status === "WARNING") return "Warning";
  return "Kritis";
}

function getStatusClass(status: InventoryStatus) {
  if (status === "AMAN") return "bg-[#10C469] text-white";
  if (status === "WARNING") return "bg-[#F5C000] text-white";
  return "bg-[#FF2F42] text-white";
}

function formatPreviewText(item?: InventoryItem) {
  if (!item) return "";
  return `${item.name} Sisa ${item.stock_current}`;
}

export default function OwnerInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [form, setForm] = useState<InventoryFormState>(CREATE_FORM_DEFAULT);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadInventory() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/api/inventory", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch inventory");
      }

      setItems(data);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to fetch inventory"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) =>
      `${item.name} ${item.unit}`.toLowerCase().includes(keyword)
    );
  }, [items, search]);

  const amanItems = useMemo(
    () => items.filter((item) => item.stock_status === "AMAN"),
    [items]
  );

  const warningItems = useMemo(
    () => items.filter((item) => item.stock_status === "WARNING"),
    [items]
  );

  const kritisItems = useMemo(
    () => items.filter((item) => item.stock_status === "KRITIS"),
    [items]
  );

  function openCreateModal() {
    setModalMode("create");
    setSelectedItem(null);
    setForm(CREATE_FORM_DEFAULT);
    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(true);
  }

  function openEditModal(item: InventoryItem) {
    setModalMode("edit");
    setSelectedItem(item);
    setForm({
      name: item.name,
      unit: item.unit,
      stock_initial: "",
      stock_add: "",
      safe_min_qty: String(item.safe_min_qty),
      warning_min_qty: String(item.warning_min_qty),
      warning_max_qty: String(item.warning_max_qty),
    });
    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    setSelectedItem(null);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function updateForm(field: keyof InventoryFormState, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!form.name.trim()) {
        throw new Error("Nama produk wajib diisi.");
      }

      if (modalMode === "create") {
        if (!form.unit.trim()) {
          throw new Error("Unit wajib diisi.");
        }

        const payload = {
          name: form.name.trim(),
          unit: form.unit.trim(),
          stock_initial: Number(form.stock_initial || 0),
          input_by: "owner",
          note: "Initial stock",
          safe_min_qty: Number(form.safe_min_qty),
          warning_min_qty: Number(form.warning_min_qty),
          warning_max_qty: Number(form.warning_max_qty),
        };

        const res = await fetch("/api/owner/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to create item");
        }

        setSuccessMessage("Barang berhasil ditambahkan.");
      } else {
        if (!selectedItem) throw new Error("Selected item not found");

        const payload = {
          name: form.name.trim(),
          stock_add: Number(form.stock_add || 0),
          safe_min_qty: Number(form.safe_min_qty),
          warning_min_qty: Number(form.warning_min_qty),
          warning_max_qty: Number(form.warning_max_qty),
        };

        const res = await fetch(
          `/api/owner/inventory/${selectedItem.inventory_item_id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to update item");
        }

        setSuccessMessage("Barang berhasil diperbarui.");
      }

      await loadInventory();

      setTimeout(() => {
        closeModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save inventory"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      if (!selectedItem) return;

      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(
        `/api/owner/inventory/${selectedItem.inventory_item_id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete item");
      }

      await loadInventory();
      closeModal();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete item"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OwnerPageShell ownerName="Owner1">
      <main className="flex-1 px-12 py-10 text-black">
        <OwnerPageHeader title="Management Dashboard" />

        <div className="rounded-[34px] border border-black/10 bg-white/5 p-10 shadow-sm backdrop-blur-[2px]">
          <div className="mb-10 grid grid-cols-1 gap-7 xl:grid-cols-3">
            <SummaryCard
              title="Stock Aman"
              value={amanItems.length}
              subtitle={formatPreviewText(amanItems[0])}
            />
            <SummaryCard
              title="Stock Warning"
              value={warningItems.length}
              subtitle={formatPreviewText(warningItems[0])}
            />
            <SummaryCard
              title="Stock Kritis"
              value={kritisItems.length}
              subtitle={formatPreviewText(kritisItems[0])}
            />
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/90 shadow-sm">
            <div className="flex items-center justify-between px-7 py-5">
              <div className="text-[28px] font-semibold text-black">
                Daftar Persediaan
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-[58px] w-[320px] items-center rounded-full border border-black/15 bg-white px-6">
                  <Search size={22} className="mr-3 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari Stock..."
                    className="w-full bg-transparent text-[18px] outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  onClick={openCreateModal}
                  className="flex h-[58px] items-center gap-2 rounded-full bg-gradient-to-r from-[#E53935] to-[#8E0000] px-8 text-[20px] font-semibold text-white shadow-sm"
                >
                  <Plus size={22} />
                  <span>Barang</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[2.4fr_1fr_1fr_1fr] bg-gradient-to-r from-[#E53935] to-[#8E0000] px-7 py-4 text-[20px] font-semibold text-white">
              <div className="text-left">Nama Barang</div>
              <div className="text-center">Stock</div>
              <div className="text-center">Status</div>
              <div className="text-center">Edit Stock</div>
            </div>

            {loading ? (
              <div className="px-7 py-10 text-[18px] text-gray-500">
                Loading inventory...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-7 py-10 text-[18px] text-gray-500">
                Tidak ada data inventory.
              </div>
            ) : (
              <div>
                {filteredItems.map((item) => (
                  <div
                    key={item.inventory_item_id}
                    className="grid grid-cols-[2.4fr_1fr_1fr_1fr] items-center border-b border-black/10 px-7 py-6"
                  >
                    <div className="pr-6 text-[22px] font-medium text-black">
                      {item.name}
                    </div>

                    <div className="text-[22px] font-medium text-black text-center">
                      {item.stock_current}
                    </div>

                    <div className="flex items-center justify-center">
                      <span
                        className={`inline-flex min-w-[140px] items-center justify-center rounded-[20px] px-6 py-2 text-[16px] font-semibold ${getStatusClass(
                          item.stock_status
                        )}`}
                      >
                        {getStatusLabel(item.stock_status)}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E53935] to-[#8E0000] px-6 py-2 text-[16px] font-semibold text-white"
                      >
                        <Pencil size={16} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMessage && !modalOpen && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 text-black">
          <div className="w-full max-w-[1180px] rounded-[34px] bg-white px-8 py-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-black/10 pb-6">
              <h2 className="text-[40px] font-semibold text-black">
                Pengaturan Produk
              </h2>

              <button onClick={closeModal} className="text-black/80">
                <X size={38} strokeWidth={2.2} />
              </button>
            </div>

            <div className="rounded-[24px] border border-black/10 p-8">
              <div className="space-y-7">
                <RowField label="Nama Produk">
                  <input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Masukkan nama produk"
                    className="w-full rounded-r-[20px] bg-transparent px-7 py-5 text-[20px] outline-none"
                  />
                </RowField>

                {modalMode === "create" ? (
                  <>
                    <RowField label="Unit">
                      <input
                        value={form.unit}
                        onChange={(e) => updateForm("unit", e.target.value)}
                        placeholder="lembar / rim / pcs"
                        className="w-full rounded-r-[20px] bg-transparent px-7 py-5 text-[20px] outline-none"
                      />
                    </RowField>

                    <RowField label="Stock Awal">
                      <input
                        type="number"
                        value={form.stock_initial}
                        onChange={(e) =>
                          updateForm("stock_initial", e.target.value)
                        }
                        placeholder="0"
                        className="w-full rounded-r-[20px] bg-transparent px-7 py-5 text-[20px] outline-none"
                      />
                    </RowField>
                  </>
                ) : (
                  <RowField label="Tambah Stok">
                    <input
                      type="number"
                      value={form.stock_add}
                      onChange={(e) => updateForm("stock_add", e.target.value)}
                      placeholder="0"
                      className="w-full rounded-r-[20px] bg-transparent px-7 py-5 text-[20px] outline-none"
                    />
                  </RowField>
                )}

                <div className="rounded-[22px] border border-black/10 px-8 py-7">
                  <div className="grid grid-cols-[220px_1fr] gap-4">
                    <div className="flex items-start pt-3 text-[20px] font-semibold text-black">
                      Batas Stok
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-7">
                        <div className="w-[110px] text-[18px] font-semibold text-black">
                          Aman
                        </div>
                        <ThresholdInput
                          operator=">"
                          value={form.safe_min_qty}
                          onChange={(value) => updateForm("safe_min_qty", value)}
                        />
                      </div>

                      <div className="flex items-center gap-7">
                        <div className="w-[110px] text-[18px] font-semibold text-black">
                          Warning
                        </div>

                        <ThresholdInput
                          operator=">"
                          value={form.warning_min_qty}
                          onChange={(value) =>
                            updateForm("warning_min_qty", value)
                          }
                        />

                        <div className="text-[30px] font-semibold text-black">
                          &
                        </div>

                        <ThresholdInput
                          operator="<"
                          value={form.warning_max_qty}
                          onChange={(value) =>
                            updateForm("warning_max_qty", value)
                          }
                        />
                      </div>

                      <div className="flex items-center gap-7">
                        <div className="w-[110px] text-[18px] font-semibold text-black">
                          Kritis
                        </div>
                        <ThresholdInput
                          operator="<"
                          value={form.warning_min_qty}
                          onChange={(value) =>
                            updateForm("warning_min_qty", value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                    {successMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between px-2">
              <button
                onClick={handleDelete}
                disabled={submitting || modalMode === "create"}
                className="rounded-full bg-gradient-to-r from-[#E53935] to-[#8E0000] px-12 py-4 text-[22px] font-semibold text-white disabled:opacity-50"
              >
                🗑 Hapus
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-full bg-gradient-to-r from-[#E53935] to-[#8E0000] px-14 py-4 text-[22px] font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Menyimpan..." : "✎ Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerPageShell>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle?: string;
}) {
  function getIcon() {
    if (title.includes("Aman")) {
      return <Database size={200} strokeWidth={1.5} />;
    }
    if (title.includes("Warning")) {
      return <Package size={200} strokeWidth={1.5} />;
    }
    return <CircleAlert size={200} strokeWidth={1.5} />;
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#E53935] to-[#8E0000] px-8 py-6 text-white shadow-sm">

      {/* ICON BACKGROUND */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white opacity-[0.08] pointer-events-none">
        {getIcon()}
      </div>

      {/* CONTENT */}
      <div className="relative z-10">
        <div className="mb-4 text-[22px] font-semibold">{title}</div>

        <div className="text-[80px] font-medium leading-none">
          {value}
        </div>

        {subtitle && (
          <div className="mt-4 inline-flex rounded-full bg-white/20 px-4 py-1 text-[14px] font-medium">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

function RowField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[240px_1fr] overflow-hidden rounded-[20px] border border-black/10">
      <div className="flex items-center border-r border-black/10 px-6 text-[18px] font-semibold text-black">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ThresholdInput({
  operator,
  value,
  onChange,
}: {
  operator: ">" | "<";
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-black/15 bg-white">
      <div className="px-5 text-[28px] font-semibold text-black">{operator}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[120px] px-4 py-3 text-[18px] outline-none"
      />
    </div>
  );
}