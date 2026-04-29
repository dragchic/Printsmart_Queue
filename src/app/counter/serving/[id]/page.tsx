"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronDown,
  FileText,
  Phone,
  Plus,
  Printer,
  Trash2,
  User,
  Check,
  Link as LinkIcon,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import WorkerPageHeader from "@/components/worker/worker-page-header";
import { ProductionMachine } from "@/generated/prisma/enums";

type ServiceOption = {
  service_option_id: number;
  name: string;
};

type InventoryItem = {
  inventory_item_id: number;
  name: string;
  unit: string;
  stock_current: number;
};

type TicketDetail = {
  ticket_id: number;
  queue_number: number;
  status: string;
  pickup_method: "DITUNGGU" | "DITINGGAL" | null;
  customer: {
    name: string;
    phone_number: string;
  };
};

type DraftMaterial = {
  inventory_item_id: string;
  specification_label: string;
  qty_planned: number;
};

type OrderFileSource = "LOCAL_UPLOAD" | "GDRIVE_LINK" | "";

type DraftFileAttachment = {
  source_type: OrderFileSource;
  original_file_name?: string;
  stored_file_name?: string;
  file_path?: string;
  mime_type?: string;
  file_size_bytes?: number;
  gdrive_url?: string;
};

type DraftItem = {
  service_option_id: string;
  custom_service_name: string;
  order_qty: number;
  note: string;
  production_machine: ProductionMachine | "";
  needs_finishing: boolean;
  materials: DraftMaterial[];
  file_attachment: DraftFileAttachment | null;
};

function maskPhone(phone: string) {
  const p = (phone ?? "").trim();
  if (p.length <= 4) return p;
  return p.slice(0) + "".repeat(Math.max(0, p.length - 4));
}

function queueLabel(queueNumber: number) {
  return `A-${String(queueNumber).padStart(3, "0")}`;
}

function machineLabel(value: ProductionMachine) {
  switch (value) {
    case "MESIN_A3_PLUS":
      return "Mesin A3+";
    case "MESIN_DTF":
      return "Mesin DTF";
    case "MESIN_INDOOR":
      return "Mesin Indoor";
    case "MESIN_PLOTTER":
      return "Mesin Plotter";
    case "MESIN_UV":
      return "Mesin UV";
    default:
      return value;
  }
}

function pickupMethodLabel(value: "DITUNGGU" | "DITINGGAL") {
  return value === "DITUNGGU" ? "Ditunggu" : "Ditinggal";
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidGoogleDriveUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("drive.google.com");
  } catch {
    return false;
  }
}

function createEmptyMaterial(): DraftMaterial {
  return {
    inventory_item_id: "",
    specification_label: "",
    qty_planned: 1,
  };
}

function createEmptyItem(): DraftItem {
  return {
    service_option_id: "",
    custom_service_name: "",
    order_qty: 1,
    note: "",
    production_machine: "",
    needs_finishing: false,
    materials: [createEmptyMaterial()],
    file_attachment: null,
  };
}

export default function CounterServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = Number(params.id);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [pickupMethod, setPickupMethod] = useState<"DITUNGGU" | "DITINGGAL">(
    "DITUNGGU"
  );
  const [user, setUser] = useState<any>(null);

  const [items, setItems] = useState<DraftItem[]>([createEmptyItem()]);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [message, setMessage] = useState("");

  const [machineOptions, setMachineOptions] = useState<ProductionMachine[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to fetch current user");
        setUser(data.user);
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    }

    fetchMe();
  }, []);

  useEffect(() => {
    async function fetchTicket() {
      try {
        const res = await fetch(`/api/tickets/${ticketId}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setMessage(data.error ?? "Failed to load ticket");
          return;
        }

        setTicket(data);

        if (
          data.pickup_method === "DITUNGGU" ||
          data.pickup_method === "DITINGGAL"
        ) {
          setPickupMethod(data.pickup_method);
        }
      } catch {
        setMessage("Unexpected error while loading ticket");
      } finally {
        setLoadingTicket(false);
      }
    }

    async function fetchMachineOptions() {
      try {
        const res = await fetch("/api/meta/production-machines", {
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;

        setMachineOptions(data.items ?? []);
      } catch (error) {
        console.error(error);
      }
    }

    async function fetchServiceOptions() {
      try {
        const res = await fetch("/api/service-options", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setServiceOptions(data.items ?? []);
      } catch (error) {
        console.error(error);
      }
    }

    async function fetchInventoryItems() {
      try {
        const res = await fetch("/api/inventory", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ([]));
        if (!res.ok) return;
        setInventoryItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      }
    }

    if (ticketId) {
      fetchTicket();
      fetchServiceOptions();
      fetchInventoryItems();
      fetchMachineOptions();
    }
  }, [ticketId]);

  function addOrderItem() {
    setItems((prev) => [...prev, createEmptyItem()]);
  }

  function removeOrderItem(index: number) {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateOrderItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function increaseOrderQty(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, order_qty: item.order_qty + 1 } : item
      )
    );
  }

  function decreaseOrderQty(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, order_qty: Math.max(1, item.order_qty - 1) }
          : item
      )
    );
  }

  function addMaterial(itemIndex: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              materials: [...item.materials, createEmptyMaterial()],
            }
          : item
      )
    );
  }

  function removeMaterial(itemIndex: number, materialIndex: number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        if (item.materials.length === 1) return item;

        return {
          ...item,
          materials: item.materials.filter((_, idx) => idx !== materialIndex),
        };
      })
    );
  }

  function handleOrderQtyInput(index: number, value: string) {
    const parsed = Number(value);

    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              order_qty:
                value === "" || Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
            }
          : item
      )
    );
  }

  function handleMaterialPlannedQtyInput(
    itemIndex: number,
    materialIndex: number,
    value: string
  ) {
    const parsed = Number(value);

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;

        return {
          ...item,
          materials: item.materials.map((material, idx) =>
            idx === materialIndex
              ? {
                  ...material,
                  qty_planned:
                    value === "" || Number.isNaN(parsed)
                      ? 1
                      : Math.max(1, parsed),
                }
              : material
          ),
        };
      })
    );
  }

  function increaseMaterialPlannedQty(itemIndex: number, materialIndex: number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;

        return {
          ...item,
          materials: item.materials.map((material, idx) =>
            idx === materialIndex
              ? { ...material, qty_planned: material.qty_planned + 1 }
              : material
          ),
        };
      })
    );
  }

  function decreaseMaterialPlannedQty(itemIndex: number, materialIndex: number) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;

        return {
          ...item,
          materials: item.materials.map((material, idx) =>
            idx === materialIndex
              ? {
                  ...material,
                  qty_planned: Math.max(1, material.qty_planned - 1),
                }
              : material
          ),
        };
      })
    );
  }

  function updateMaterial(
    itemIndex: number,
    materialIndex: number,
    patch: Partial<DraftMaterial>
  ) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;

        return {
          ...item,
          materials: item.materials.map((material, idx) =>
            idx === materialIndex ? { ...material, ...patch } : material
          ),
        };
      })
    );
  }

  function setAttachmentSource(itemIndex: number, source: OrderFileSource) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              file_attachment:
                source === ""
                  ? null
                  : source === "LOCAL_UPLOAD"
                    ? { source_type: "LOCAL_UPLOAD" }
                    : { source_type: "GDRIVE_LINK", gdrive_url: "" },
            }
          : item
      )
    );
  }

  function updateAttachment(
    itemIndex: number,
    patch: Partial<DraftFileAttachment> | null
  ) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item;
        if (patch === null) {
          return { ...item, file_attachment: null };
        }

        return {
          ...item,
          file_attachment: {
            source_type: item.file_attachment?.source_type ?? "",
            ...item.file_attachment,
            ...patch,
          },
        };
      })
    );
  }

  async function handleUploadFile(itemIndex: number, file: File) {
    try {
      setMessage("");

      if (!ticketId || Number.isNaN(ticketId)) {
        setMessage("Ticket ID tidak valid.");
        return;
      }

      setUploadingIndex(itemIndex);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("ticket_id", String(ticketId));

      const res = await fetch("/api/order-files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data?.error || "Failed to upload file");
        return;
      }

      updateAttachment(itemIndex, {
        source_type: "LOCAL_UPLOAD",
        original_file_name: data.file?.original_file_name,
        stored_file_name: data.file?.stored_file_name,
        file_path: data.file?.file_path,
        mime_type: data.file?.mime_type,
        file_size_bytes: data.file?.file_size_bytes,
        gdrive_url: "",
      });
    } catch (error) {
      console.error(error);
      setMessage("Unexpected error while uploading file");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function handleSkip() {
    try {
      setLoadingSubmit(true);
      setMessage("");

      const res = await fetch("/api/tickets/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          status: "SKIPPED",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error ?? "Failed to skip ticket");
        return;
      }

      router.push("/counter");
    } catch {
      setMessage("Unexpected error while skipping ticket");
    } finally {
      setLoadingSubmit(false);
    }
  }

  async function handleSubmit() {
    setLoadingSubmit(true);
    setMessage("");

    try {
      if (!ticketId || Number.isNaN(ticketId)) {
        setMessage("Ticket ID tidak valid");
        setLoadingSubmit(false);
        return;
      }

      for (const item of items) {
        if (!item.service_option_id && !item.custom_service_name.trim()) {
          setMessage(
            "Setiap layanan harus memiliki tipe layanan atau custom service."
          );
          setLoadingSubmit(false);
          return;
        }

        if (!item.order_qty || item.order_qty < 1) {
          setMessage("Jumlah order minimal 1.");
          setLoadingSubmit(false);
          return;
        }

        if (!item.production_machine) {
          setMessage("Mesin produksi wajib dipilih.");
          setLoadingSubmit(false);
          return;
        }

        if (!item.materials || item.materials.length === 0) {
          setMessage("Setiap layanan harus memiliki minimal 1 spesifikasi.");
          setLoadingSubmit(false);
          return;
        }

        for (const material of item.materials) {
          if (!material.inventory_item_id) {
            setMessage("Setiap spesifikasi wajib memilih bahan.");
            setLoadingSubmit(false);
            return;
          }

          if (!material.qty_planned || material.qty_planned < 1) {
            setMessage("Jumlah spesifikasi minimal 1.");
            setLoadingSubmit(false);
            return;
          }
        }

        if (item.file_attachment?.source_type === "LOCAL_UPLOAD") {
          if (!item.file_attachment.file_path) {
            setMessage("File upload belum berhasil disimpan.");
            setLoadingSubmit(false);
            return;
          }
        }

        if (item.file_attachment?.source_type === "GDRIVE_LINK") {
          const url = item.file_attachment.gdrive_url?.trim() || "";
          if (!url) {
            setMessage("Link Google Drive wajib diisi.");
            setLoadingSubmit(false);
            return;
          }
          if (!isValidGoogleDriveUrl(url)) {
            setMessage("Link Google Drive tidak valid.");
            setLoadingSubmit(false);
            return;
          }
        }
      }

      const updatePickupRes = await fetch("/api/tickets/update-service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: ticketId,
          pickup_method: pickupMethod,
        }),
      });

      const updatePickupData = await updatePickupRes.json().catch(() => ({}));

      if (!updatePickupRes.ok) {
        setMessage(updatePickupData.error ?? "Failed to update pickup method");
        setLoadingSubmit(false);
        return;
      }

      const payload = {
        items: items.map((item) => ({
          service_option_id: item.service_option_id
            ? Number(item.service_option_id)
            : null,
          custom_service_name: item.custom_service_name.trim() || null,
          order_qty: item.order_qty,
          note: item.note.trim() || null,
          production_machine: item.production_machine || null,
          needs_finishing: item.needs_finishing,
          materials: item.materials.map((material, index) => ({
            inventory_item_id: Number(material.inventory_item_id),
            specification_label: material.specification_label.trim() || null,
            qty_planned: material.qty_planned,
            sort_order: index,
          })),
          file_attachment: item.file_attachment
            ? {
                source_type: item.file_attachment.source_type,
                original_file_name: item.file_attachment.original_file_name || null,
                stored_file_name: item.file_attachment.stored_file_name || null,
                file_path: item.file_attachment.file_path || null,
                mime_type: item.file_attachment.mime_type || null,
                file_size_bytes: item.file_attachment.file_size_bytes || null,
                gdrive_url: item.file_attachment.gdrive_url?.trim() || null,
              }
            : null,
        })),
      };

      const res = await fetch(`/api/counter/tickets/${ticketId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error ?? "Failed to save order items");
        setLoadingSubmit(false);
        return;
      }

      router.push("/counter");
    } catch (error) {
      console.error(error);
      setMessage("Unexpected error while saving order");
    } finally {
      setLoadingSubmit(false);
    }
  }

  return (
    <main
      className="min-h-screen w-full overflow-x-hidden text-black"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.58), rgba(255,255,255,0.58)), url('/pg-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <WorkerPageHeader
          role="Counter Worker"
          name={user?.full_name || user?.username || ""}
        />

        <div
          className="mt-8 rounded-[24px] border px-4 py-5 sm:px-6 sm:py-6 lg:mt-14 lg:rounded-[28px] lg:px-[54px] lg:py-[42px]"
          style={{
            borderColor: "#CCCCCC",
            backgroundColor: "rgba(250, 245, 251, 0.10)",
            backdropFilter: "blur(4px)",
          }}
        >
          {loadingTicket ? (
            <div className="text-base text-gray-500 sm:text-lg">
              Loading ticket detail...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-10">
              <section className="xl:col-span-4">
                <div className="flex flex-col gap-6 lg:gap-8">
                  <div
                    className="rounded-[24px] border px-5 py-6 sm:px-8 sm:py-8 lg:rounded-[28px]"
                    style={{
                      borderColor: "#CCCCCC",
                      backgroundColor: "rgba(255,255,255,0.72)",
                    }}
                  >
                    <div className="text-center">
                      <div className="text-[24px] font-semibold leading-none sm:text-[30px] lg:text-[34px]">
                        Customer :
                      </div>
                      <div className="mt-6 text-[44px] font-bold leading-none tracking-wide sm:text-[58px] lg:mt-8 lg:text-[68px]">
                        {ticket ? queueLabel(ticket.queue_number) : "-"}
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-[24px] border px-5 py-6 sm:px-8 sm:py-8 lg:rounded-[28px]"
                    style={{
                      borderColor: "#CCCCCC",
                      backgroundColor: "rgba(255,255,255,0.72)",
                    }}
                  >
                    <div className="text-center">
                      <div className="text-[24px] font-semibold leading-none sm:text-[28px] lg:text-[30px]">
                        Data Pelanggan
                      </div>
                      <div className="mt-3 text-[16px] font-medium text-black sm:text-[18px]">
                        pastikan data
                      </div>
                      <div className="text-[16px] font-medium text-black sm:text-[18px]">
                        Pelanggan sudah benar
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:gap-5">
                      <div
                        className="flex items-center gap-4 rounded-[16px] border px-4 sm:h-[72px] sm:px-5 lg:rounded-[18px]"
                        style={{
                          minHeight: "64px",
                          borderColor: "#D6D6D6",
                          backgroundColor: "#F7F7F7",
                        }}
                      >
                        <User size={24} strokeWidth={2.3} />
                        <span className="text-[18px] font-medium sm:text-[20px]">
                          {ticket?.customer.name ?? "-"}
                        </span>
                      </div>

                      <div
                        className="flex items-center gap-4 rounded-[16px] border px-4 sm:h-[72px] sm:px-5 lg:rounded-[18px]"
                        style={{
                          minHeight: "64px",
                          borderColor: "#D6D6D6",
                          backgroundColor: "#F7F7F7",
                        }}
                      >
                        <Phone size={24} strokeWidth={2.3} />
                        <span className="text-[18px] font-medium sm:text-[20px]">
                          {ticket?.customer.phone_number
                            ? ticket.customer.phone_number
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="xl:col-span-8">
                <div className="flex flex-col gap-6 lg:gap-8">
                  {items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="rounded-[24px] border px-4 py-5 sm:px-6 sm:py-6 lg:rounded-[28px] lg:px-8 lg:py-7"
                      style={{
                        borderColor: "#CCCCCC",
                        backgroundColor: "rgba(255,255,255,0.72)",
                      }}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <h2 className="text-[24px] font-semibold leading-tight sm:text-[28px] lg:text-[32px]">
                          Detail Order Pelanggan
                        </h2>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {itemIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => removeOrderItem(itemIndex)}
                              className="flex items-center justify-center rounded-[12px] text-white"
                              style={{
                                width: "42px",
                                height: "42px",
                                background:
                                  "linear-gradient(180deg, #FF3D3D 0%, #B10000 100%)",
                              }}
                            >
                              <Trash2 size={20} strokeWidth={2.4} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={addOrderItem}
                            className="flex items-center justify-center rounded-[12px] text-white"
                            style={{
                              width: "42px",
                              height: "42px",
                              background:
                                "linear-gradient(180deg, #FF3D3D 0%, #B10000 100%)",
                            }}
                          >
                            <Plus size={22} strokeWidth={2.4} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 lg:mt-8 lg:grid-cols-2">
                        <div>
                          <label className="block text-[18px] font-medium sm:text-[20px] lg:text-[22px]">
                            Tipe Layanan
                          </label>

                          <div className="relative mt-3">
                            <Printer
                              size={22}
                              strokeWidth={2.2}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-black"
                            />
                            <select
                              value={item.service_option_id}
                              onChange={(e) =>
                                updateOrderItem(itemIndex, {
                                  service_option_id: e.target.value,
                                })
                              }
                              className="h-[56px] w-full appearance-none rounded-[18px] border bg-white pl-14 pr-12 text-[16px] font-medium outline-none sm:h-[60px] sm:text-[17px] lg:h-[62px] lg:rounded-[20px] lg:text-[18px]"
                              style={{
                                borderColor: "#D1D1D1",
                                backgroundColor: "#F9F9F9",
                              }}
                            >
                              <option value="">Pilih tipe layanan</option>
                              {serviceOptions.map((option) => (
                                <option
                                  key={option.service_option_id}
                                  value={option.service_option_id}
                                >
                                  {option.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={22}
                              strokeWidth={2.3}
                              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[18px] font-medium sm:text-[20px] lg:text-[22px]">
                            Jumlah Order
                          </label>

                          <div
                            className="mt-3 flex overflow-hidden rounded-[16px] border lg:rounded-[18px]"
                            style={{
                              width: "100%",
                              maxWidth: "170px",
                              height: "56px",
                              borderColor: "#D1D1D1",
                              backgroundColor: "#F4F4F4",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => decreaseOrderQty(itemIndex)}
                              className="flex w-[44px] shrink-0 items-center justify-center text-[28px] font-medium sm:w-[46px] sm:text-[32px]"
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min={1}
                              value={item.order_qty}
                              onChange={(e) =>
                                handleOrderQtyInput(itemIndex, e.target.value)
                              }
                              className="min-w-0 flex-1 border-x border-[#D1D1D1] bg-white text-center text-[18px] font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none sm:text-[20px]"
                            />

                            <button
                              type="button"
                              onClick={() => increaseOrderQty(itemIndex)}
                              className="flex w-[44px] shrink-0 items-center justify-center text-[28px] font-medium sm:w-[46px] sm:text-[32px]"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[18px] font-medium sm:text-[20px] lg:text-[22px]">
                            Catatan
                          </label>

                          <input
                            type="text"
                            value={item.note}
                            onChange={(e) =>
                              updateOrderItem(itemIndex, {
                                note: e.target.value,
                              })
                            }
                            placeholder='Contoh: “Print warna, jilid spiral”'
                            className="mt-3 h-[56px] w-full rounded-[16px] border px-4 text-[16px] font-medium text-black outline-none sm:h-[60px] sm:px-5 sm:text-[17px] lg:rounded-[18px] lg:text-[18px]"
                            style={{
                              borderColor: "#D1D1D1",
                              backgroundColor: "#F8F8F8",
                            }}
                          />
                        </div>

                        <div>
                          <label className="block text-[18px] font-medium sm:text-[20px] lg:text-[22px]">
                            Mesin Produksi
                          </label>

                          <div className="relative mt-3">
                            <select
                              value={item.production_machine}
                              onChange={(e) =>
                                updateOrderItem(itemIndex, {
                                  production_machine:
                                    e.target.value as ProductionMachine,
                                })
                              }
                              className="h-[56px] w-full appearance-none rounded-[16px] border bg-white px-4 pr-12 text-[16px] font-medium outline-none sm:h-[60px] sm:px-5 sm:text-[17px] lg:rounded-[18px] lg:text-[18px]"
                              style={{
                                borderColor: "#D1D1D1",
                                backgroundColor: "#F9F9F9",
                              }}
                            >
                              <option value="">Pilih mesin produksi</option>
                              {machineOptions.map((machine) => (
                                <option key={machine} value={machine}>
                                  {machineLabel(machine)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={22}
                              strokeWidth={2.3}
                              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black"
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        className="mt-6 border-t pt-5 lg:mt-7 lg:pt-6"
                        style={{ borderColor: "#D9D9D9" }}
                      >
                        <label className="block text-[18px] font-medium sm:text-[20px] lg:text-[22px]">
                          Spesifikasi
                        </label>

                        <div className="mt-4 flex flex-col gap-4">
                          {item.materials.map((material, materialIndex) => (
                            <div
                              key={materialIndex}
                              className="flex flex-col gap-3 xl:flex-row xl:items-center"
                            >
                              <div className="relative flex-1">
                                <FileText
                                  size={22}
                                  strokeWidth={2.2}
                                  className="absolute left-4 top-1/2 -translate-y-1/2 text-black"
                                />
                                <select
                                  value={material.inventory_item_id}
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    const selectedInventory = inventoryItems.find(
                                      (inv) =>
                                        String(inv.inventory_item_id) === selectedId
                                    );

                                    updateMaterial(itemIndex, materialIndex, {
                                      inventory_item_id: selectedId,
                                      specification_label:
                                        selectedInventory?.name ?? "",
                                    });
                                  }}
                                  className="h-[56px] w-full appearance-none rounded-[16px] border bg-white pl-12 pr-12 text-[14px] font-medium outline-none sm:h-[58px] sm:text-[15px] lg:rounded-[18px] lg:text-[16px]"
                                  style={{
                                    borderColor: "#D1D1D1",
                                    backgroundColor: "#F9F9F9",
                                  }}
                                >
                                  <option value="">Pilih bahan / spesifikasi</option>
                                  {inventoryItems.map((inv) => (
                                    <option
                                      key={inv.inventory_item_id}
                                      value={inv.inventory_item_id}
                                    >
                                      {inv.name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  size={22}
                                  strokeWidth={2.3}
                                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black"
                                />
                              </div>

                              <div className="flex items-center gap-3">
                                <div
                                  className="flex overflow-hidden rounded-[14px] border"
                                  style={{
                                    width: "100%",
                                    maxWidth: "170px",
                                    height: "50px",
                                    borderColor: "#D1D1D1",
                                    backgroundColor: "#F4F4F4",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      decreaseMaterialPlannedQty(
                                        itemIndex,
                                        materialIndex
                                      )
                                    }
                                    className="flex w-[42px] shrink-0 items-center justify-center text-[24px] font-medium lg:text-[26px]"
                                  >
                                    −
                                  </button>

                                  <input
                                    type="number"
                                    min={1}
                                    value={material.qty_planned}
                                    onChange={(e) =>
                                      handleMaterialPlannedQtyInput(
                                        itemIndex,
                                        materialIndex,
                                        e.target.value
                                      )
                                    }
                                    className="min-w-0 flex-1 border-x border-[#D1D1D1] bg-white text-center text-[16px] font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none lg:text-[18px]"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      increaseMaterialPlannedQty(
                                        itemIndex,
                                        materialIndex
                                      )
                                    }
                                    className="flex w-[42px] shrink-0 items-center justify-center text-[24px] font-medium lg:text-[26px]"
                                  >
                                    +
                                  </button>
                                </div>

                                {materialIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeMaterial(itemIndex, materialIndex)
                                    }
                                    className="flex items-center justify-center rounded-[12px] text-white"
                                    style={{
                                      width: "40px",
                                      height: "40px",
                                      background:
                                        "linear-gradient(180deg, #FF3D3D 0%, #B10000 100%)",
                                    }}
                                  >
                                    <Trash2 size={18} strokeWidth={2.4} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => addMaterial(itemIndex)}
                                  className="flex items-center justify-center rounded-[12px] text-white"
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    background:
                                      "linear-gradient(180deg, #FF3D3D 0%, #B10000 100%)",
                                  }}
                                >
                                  <Plus size={20} strokeWidth={2.4} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6">
                          <label className="block text-[18px] font-medium sm:text-[20px] lg:text-[22px]">
                            File Desain
                          </label>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => setAttachmentSource(itemIndex, "LOCAL_UPLOAD")}
                              className={`flex items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-[15px] font-medium transition ${
                                item.file_attachment?.source_type === "LOCAL_UPLOAD"
                                  ? "border-transparent bg-gradient-to-r from-[#FF3D3D] to-[#930000] text-white"
                                  : "border-[#D1D1D1] bg-white text-black"
                              }`}
                            >
                              <Upload size={18} />
                              Upload File
                            </button>

                            <button
                              type="button"
                              onClick={() => setAttachmentSource(itemIndex, "GDRIVE_LINK")}
                              className={`flex items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-[15px] font-medium transition ${
                                item.file_attachment?.source_type === "GDRIVE_LINK"
                                  ? "border-transparent bg-gradient-to-r from-[#FF3D3D] to-[#930000] text-white"
                                  : "border-[#D1D1D1] bg-white text-black"
                              }`}
                            >
                              <LinkIcon size={18} />
                              Link Google Drive
                            </button>

                            {item.file_attachment && (
                              <button
                                type="button"
                                onClick={() => updateAttachment(itemIndex, null)}
                                className="flex items-center justify-center gap-2 rounded-[14px] border border-[#D1D1D1] bg-white px-4 py-3 text-[15px] font-medium text-black"
                              >
                                <X size={18} />
                                Hapus
                              </button>
                            )}
                          </div>

                          {item.file_attachment?.source_type === "LOCAL_UPLOAD" && (
                            <div className="mt-4 rounded-[18px] border border-[#D1D1D1] bg-[#F9F9F9] p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-[15px] font-medium text-black border border-[#D1D1D1]">
                                  {uploadingIndex === itemIndex ? (
                                    <>
                                      <Loader2 size={18} className="animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload size={18} />
                                      Pilih File
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    className="hidden"
                                    disabled={uploadingIndex === itemIndex}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleUploadFile(itemIndex, file);
                                      }
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                </label>

                                {item.file_attachment.file_path && (
                                  <a
                                  href={`/api/order-files/view?path=${encodeURIComponent(
                                    item.file_attachment.file_path || ""
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[14px] font-medium text-[#930000] underline"
                                  >
                                    Lihat file
                                  </a>
                                )}
                              </div>

                              {item.file_attachment.original_file_name && (
                                <div className="mt-3 text-[14px] text-black">
                                  <div>
                                    <span className="font-semibold">Nama file:</span>{" "}
                                    {item.file_attachment.original_file_name}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Ukuran:</span>{" "}
                                    {formatFileSize(item.file_attachment.file_size_bytes)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {item.file_attachment?.source_type === "GDRIVE_LINK" && (
                            <div className="mt-4">
                              <input
                                type="url"
                                value={item.file_attachment.gdrive_url || ""}
                                onChange={(e) =>
                                  updateAttachment(itemIndex, {
                                    source_type: "GDRIVE_LINK",
                                    gdrive_url: e.target.value,
                                  })
                                }
                                placeholder="Paste link Google Drive di sini"
                                className="h-[56px] w-full rounded-[16px] border px-4 text-[16px] font-medium text-black outline-none sm:h-[60px] sm:px-5"
                                style={{
                                  borderColor: "#D1D1D1",
                                  backgroundColor: "#F8F8F8",
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex items-center gap-3 lg:mt-7">
                          <button
                            type="button"
                            onClick={() =>
                              updateOrderItem(itemIndex, {
                                needs_finishing: !item.needs_finishing,
                              })
                            }
                            className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] border bg-white"
                            style={{
                              borderColor: "#CFCFCF",
                            }}
                          >
                            {item.needs_finishing && (
                              <Check size={18} strokeWidth={3} />
                            )}
                          </button>

                          <span className="text-[15px] font-medium sm:text-[16px]">
                            Perlu Divisi Finishing?
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-2 flex flex-col gap-4 lg:mt-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="w-full lg:max-w-[270px]">
                      <label className="mb-2 block text-[15px] font-medium text-black sm:text-[16px]">
                        Metode Pengambilan
                      </label>
                      <div className="relative">
                        <select
                          value={pickupMethod}
                          onChange={(e) =>
                            setPickupMethod(
                              e.target.value as "DITUNGGU" | "DITINGGAL"
                            )
                          }
                          className="h-[54px] w-full appearance-none rounded-[18px] border bg-white px-4 pr-12 text-[16px] font-medium outline-none"
                          style={{
                            borderColor: "#D1D1D1",
                            backgroundColor: "#F9F9F9",
                          }}
                        >
                          <option value="DITUNGGU">
                            {pickupMethodLabel("DITUNGGU")}
                          </option>
                          <option value="DITINGGAL">
                            {pickupMethodLabel("DITINGGAL")}
                          </option>
                        </select>
                        <ChevronDown
                          size={22}
                          strokeWidth={2.3}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black"
                        />
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end lg:w-auto">
                      <button
                        type="button"
                        onClick={handleSkip}
                        disabled={loadingSubmit}
                        className="w-full rounded-[22px] border border-[#D1D1D1] bg-white px-6 text-[18px] font-semibold text-black transition hover:bg-[#F4F4F4] disabled:opacity-70 sm:h-[68px] sm:w-[180px]"
                      >
                        Skip
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loadingSubmit || uploadingIndex !== null}
                        className="w-full rounded-[22px] text-white transition hover:brightness-105 disabled:bg-gray-400 sm:rounded-[24px] lg:w-auto lg:min-w-[360px] lg:rounded-[26px]"
                        style={{
                          height: "68px",
                          background:
                            "linear-gradient(90deg, #FF3D3D 0%, #930000 100%)",
                          fontSize: "22px",
                          fontWeight: 700,
                        }}
                      >
                        {loadingSubmit ? "Menyimpan..." : "Simpan & Proses Order"}
                      </button>
                    </div>
                  </div>

                  {message && (
                    <div className="text-[15px] font-medium text-red-600 sm:text-[16px]">
                      {message}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}