"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  RefreshCcw,
  RotateCcw,
  Printer,
  Info
} from "lucide-react";

type ProductionMachine =
  | "MESIN_A3_PLUS"
  | "MESIN_DTF"
  | "MESIN_INDOOR"
  | "MESIN_PLOTTER"
  | "MESIN_UV";

type MachineTaskMaterial = {
  queue_ticket_item_material_id: number;
  inventory_item_id: number;
  inventory_name: string;
  unit: string;
  stock_current: number;
  specification_label: string;
  qty_planned: number | null;
  sort_order: number;
  latest_usage: {
    qty_good: number;
    qty_waste: number;
    qty_total_used: number;
    input_by: string | null;
    note: string | null;
    created_at: string;
  } | null;
};

type MachineTaskFile = {
  order_file_id: number;
  source_type: "LOCAL_UPLOAD" | "GDRIVE_LINK";
  original_file_name: string | null;
  stored_file_name: string | null;
  file_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  gdrive_url: string | null;
};

type MachineTask = {
  id: number;
  ticket_id: number;
  queue_number: number;
  customer_name: string;
  customer_phone: string;
  service_option_id: number | null;
  service_name: string;
  order_qty: number;
  note: string | null;
  production_machine: ProductionMachine | null;
  needs_finishing: boolean;
  machine_status: "WAITING" | "PROCESSING" | "DONE";
  machine_note: string | null;
  processed_by: string | null;
  machine_started_at: string | null;
  machine_finished_at: string | null;
  pickup_method: "DITUNGGU" | "DITINGGAL" | null;
  pickup_status: "NOT_READY" | "READY_NOT_TAKEN" | "TAKEN" | "EXPIRED" | null;
  materials: MachineTaskMaterial[];
  files: MachineTaskFile[];
};

type MachineTaskResponse = {
  machine: ProductionMachine;
  total: number;
  data: MachineTask[];
};

type UserMe = {
  full_name?: string;
  username?: string;
};

type MaterialUsageDraft = {
  queue_ticket_item_material_id: number;
  qty_good: number;
  qty_waste: number;
};

function queueLabel(queueNumber: number) {
  return `A-${String(queueNumber).padStart(3, "0")}`;
}

function machineLabel(machine: ProductionMachine) {
  switch (machine) {
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
      return machine;
  }
}

const MACHINE_TABS: ProductionMachine[] = [
  "MESIN_A3_PLUS",
  "MESIN_DTF",
  "MESIN_INDOOR",
  "MESIN_PLOTTER",
  "MESIN_UV",
];

export default function WorkerMachinePage() {
  const router = useRouter();

  const [activeMachine, setActiveMachine] =
    useState<ProductionMachine>("MESIN_A3_PLUS");
  const [tasks, setTasks] = useState<MachineTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [submittingFinishId, setSubmittingFinishId] = useState<number | null>(
    null
  );
  const [machineNote, setMachineNote] = useState("");
  const [materialUsages, setMaterialUsages] = useState<MaterialUsageDraft[]>([]);
  const [user, setUser] = useState<UserMe | null>(null);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
  }

  async function fetchTasks(machine = activeMachine) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/worker/machine/tasks?machine=${machine}&only_active=true`,
        {
          cache: "no-store",
        }
      );

      const data: MachineTaskResponse | { error?: string } = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        setTasks([]);
        setSelectedTaskId(null);
        setMessage((data as { error?: string }).error ?? "Failed to load tasks");
        return;
      }

      const nextTasks = (data as MachineTaskResponse).data ?? [];
      setTasks(nextTasks);

      if (nextTasks.length === 0) {
        setSelectedTaskId(null);
        setMachineNote("");
        setMaterialUsages([]);
        return;
      }

      const stillExists = nextTasks.find((task) => task.id === selectedTaskId);
      const nextSelected = stillExists ?? nextTasks[0];
      setSelectedTaskId(nextSelected.id);
    } catch (error) {
      console.error(error);
      setTasks([]);
      setSelectedTaskId(null);
      setMessage("Unexpected error while loading machine tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks(activeMachine);
  }, [activeMachine]);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) return;
        setUser(data.user);
      } catch (error) {
        console.error(error);
      }
    }

    fetchMe();
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/tickets/stream");

    es.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        if (
          msg.type === "machine_task_changed" ||
          msg.type === "waiting_changed" ||
          msg.type === "pickup_status_changed"
        ) {
          fetchTasks(activeMachine);
        }
      } catch (error) {
        console.error("Machine SSE parse error:", error);
      }
    };

    es.onerror = (error) => {
      console.error("Machine SSE error:", error);
    };

    return () => es.close();
  }, [activeMachine]);

  useEffect(() => {
    if (!selectedTask) return;

    setMachineNote(selectedTask.machine_note ?? selectedTask.note ?? "");

    setMaterialUsages(
      selectedTask.materials.map((material) => ({
        queue_ticket_item_material_id: material.queue_ticket_item_material_id,
        qty_good:
          material.latest_usage?.qty_good ??
          Math.max(1, Number(material.qty_planned ?? 1)),
        qty_waste: material.latest_usage?.qty_waste ?? 0,
      }))
    );
  }, [selectedTask]);

  function updateMaterialQty(
    materialId: number,
    field: "qty_good" | "qty_waste",
    value: number
  ) {
    setMaterialUsages((prev) =>
      prev.map((item) =>
        item.queue_ticket_item_material_id === materialId
          ? {
              ...item,
              [field]: Math.max(0, value),
            }
          : item
      )
    );
  }

  function handleMaterialQtyInput(
    materialId: number,
    field: "qty_good" | "qty_waste",
    value: string
  ) {
    const parsed = Number(value);

    updateMaterialQty(
      materialId,
      field,
      value === "" || Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    );
  }

  function increaseQty(materialId: number, field: "qty_good" | "qty_waste") {
    const current = materialUsages.find(
      (item) => item.queue_ticket_item_material_id === materialId
    );

    updateMaterialQty(materialId, field, (current?.[field] ?? 0) + 1);
  }

  function decreaseQty(materialId: number, field: "qty_good" | "qty_waste") {
    const current = materialUsages.find(
      (item) => item.queue_ticket_item_material_id === materialId
    );

    updateMaterialQty(materialId, field, Math.max(0, (current?.[field] ?? 0) - 1));
  }

  async function handleFinishTask() {
    if (!selectedTask) return;

    if (materialUsages.length === 0) {
      setMessage("Material usage belum tersedia.");
      return;
    }

    const hasInvalidUsage = materialUsages.some(
      (usage) => Number(usage.qty_good ?? 0) + Number(usage.qty_waste ?? 0) <= 0
    );

    if (hasInvalidUsage) {
      setMessage("Setiap spesifikasi harus memiliki jumlah pemakaian bahan.");
      return;
    }

    setSubmittingFinishId(selectedTask.id);
    setMessage("");

    try {
      const res = await fetch(
        `/api/worker/machine/items/${selectedTask.id}/finish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            machine_note: machineNote,
            materials_usage: materialUsages,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error ?? "Failed to finish machine task");
        return;
      }

      await fetchTasks(activeMachine);
    } catch (error) {
      console.error(error);
      setMessage("Unexpected error while finishing task");
    } finally {
      setSubmittingFinishId(null);
    }
  }

  function handleOpenConfirm() {
    if (!selectedTask) return;
  
    if (materialUsages.length === 0) {
      setMessage("Material usage belum tersedia.");
      return;
    }
  
    const hasInvalidUsage = materialUsages.some(
      (usage) => Number(usage.qty_good ?? 0) + Number(usage.qty_waste ?? 0) <= 0
    );
  
    if (hasInvalidUsage) {
      setMessage("Setiap spesifikasi harus memiliki jumlah pemakaian bahan.");
      return;
    }
  
    setMessage("");
    setShowConfirmModal(true);
  }

  function formatFileSize(bytes?: number | null) {
    if (!bytes || bytes <= 0) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const currentTask = selectedTask;
  const orderList = tasks.filter((task) => task.id !== selectedTaskId);

  return (
    <main
      className="min-h-screen w-full overflow-x-hidden text-black"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.1), rgba(255, 146, 146, 0.2)), url('/pg-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="px-14 py-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <Image
                src="/printsmart-logo.png"
                alt="printSmart"
                width={250}
                height={70}
                priority
                className="h-auto w-[290px]"
              />
            </div>

            <div
              className="mx-4 shrink-0"
              style={{
                width: "1px",
                height: "54px",
                backgroundColor: "#E7BFC0",
              }}
            />

            <div className="flex flex-col">
              <h1 className="text-[24px] font-semibold leading-none tracking-tight text-black">
                Machine Worker
              </h1>
              <span className="mt-3 text-[18px] font-medium text-black">
                {user?.full_name || user?.username || "Nama Worker"}
              </span>
            </div>
          </div>

          <div className="mt-2 text-right leading-tight">
            <div className="text-[18px] font-bold" style={{ color: "#ED2021" }}>
              Your Every Printing Solution
            </div>
            <div
              className="mt-2 text-[18px] font-bold"
              style={{ color: "#ED2021" }}
            >
              Since 2019
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {MACHINE_TABS.map((machine) => {
            const active = activeMachine === machine;

            return (
              <button
                key={machine}
                type="button"
                onClick={() => setActiveMachine(machine)}
                className="rounded-[22px] border text-[22px] font-semibold transition"
                style={{
                  width: "210px",
                  height: "64px",
                  borderColor: active ? "transparent" : "#CFCFCF",
                  background: active
                    ? "linear-gradient(90deg, #FF3D3D 0%, #930000 100%)"
                    : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#1A1A1A",
                }}
              >
                {machineLabel(machine)}
              </button>
            );
          })}

          <button
            onClick={handleLogout}
            className="ml-auto flex items-center justify-center gap-3 rounded-2xl border border-[#CCCCCC] bg-[#FAF5FB]/10 px-5 py-3 text-[18px] font-semibold text-[#ED2021] backdrop-blur-md transition hover:bg-white/15"
            style={{
              color: "#ED2021",
              backgroundColor: "rgba(250, 245, 251, 0.10)",
              borderColor: "#CCCCCC",
            }}
          >
            <LogOut size={22} strokeWidth={2.5} />
            <span>Log Out</span>
          </button>
        </div>

        <div className="mt-8 grid grid-cols-12 gap-6">
          <section className="col-span-6">
            <div
              className="rounded-[28px] border border-black/10 bg-white/5 shadow-sm backdrop-blur-2px"
              style={{
                minHeight: "850px",
                borderColor: "#CCCCCC",
                backgroundColor: "rgba(255, 255, 255, 0)",
              }}
            >
              <div className="flex items-start justify-between px-10 pt-8">
                <h2 className="text-[38px] font-semibold">Order List</h2>

                <button
                  onClick={() => fetchTasks(activeMachine)}
                  className="flex items-center justify-center rounded-[22px] border transition hover:bg-white/20"
                  style={{
                    height: "62px",
                    width: "72px",
                    borderColor: "#CCCCCC",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                  }}
                >
                  <RefreshCcw size={30} strokeWidth={2.1} color="#7F7F7F" />
                </button>
              </div>

              <div className="px-8 pb-8 pt-6">
                {loading ? (
                  <div
                    className="rounded-[24px] border px-6 py-6 text-gray-500"
                    style={{
                      borderColor: "#D6D6D6",
                      backgroundColor: "rgba(255,255,255,0.72)",
                    }}
                  >
                    Loading machine tasks...
                  </div>
                ) : tasks.length === 0 ? (
                  <div
                    className="rounded-[24px] border px-6 py-6 text-gray-500"
                    style={{
                      borderColor: "#D6D6D6",
                      backgroundColor: "rgba(255,255,255,0.72)",
                    }}
                  >
                    Tidak ada task untuk mesin ini.
                  </div>
                ) : (
                  <>

                    <div className="mt-8">
                     

                      
                        <div className="mt-6 space-y-4">

                          {tasks.map((task) => {
                            const isActive = task.id === selectedTaskId;

                            return (
                              <div
                                key={task.id}
                                className="rounded-[18px] border px-6 py-5 bg-white shadow-sm"
                                style={{
                                  borderColor: "#E5E5E5",
                                }}
                              >
                                {/* ROW 1 */}
                                <div className="flex justify-between items-center">
                                  <div className="text-[28px] font-semibold">
                                    {queueLabel(task.queue_number)}
                                  </div>

                                  <div className="text-[14px] font-semibold text-black">
                                    {task.pickup_method || "-"}
                                  </div>
                                </div>

                                {/* ROW 2 */}
                                <div className="mt-2 flex justify-between items-center">
                                  
                                  {/* LEFT */}
                                  <div>
                                    <div className="text-[18px]">
                                      {task.service_name}
                                    </div>

                                    <div className="text-[20px] text-gray-600">
                                      Qty: {task.order_qty}
                                    </div>
                                  </div>

                                  {/* RIGHT BUTTON */}
                                  <button
                                    onClick={() => setSelectedTaskId(task.id)}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-white font-semibold"
                                    style={{
                                      background:
                                        "linear-gradient(90deg, #FF4B4B 0%, #B40000 100%)",
                                    }}
                                  >
                                    <RotateCcw size={16} />
                                    Proses
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <aside className="col-span-6">
            <div
              className="rounded-[28px] border px-7 py-7"
              style={{
                minHeight: "560px",
                borderColor: "#CCCCCC",
                backgroundColor: "rgba(255,255,255,0.72)",
              }}
            >
              <div className="text-[28px] font-semibold leading-none">
                Detail Order Pekerjaan
              </div>

              {selectedTask ? (
                <>
                  <div className="mt-8 text-[56px] font-bold leading-none">
                    {queueLabel(selectedTask.queue_number)}
                  </div>

                  <div className="mt-5">
                    <div className="text-[18px] font-semibold">Tipe Layanan</div>
                    <div
                      className="mt-2 flex h-[46px] items-center gap-3 rounded-[14px] border px-4 text-[16px] font-medium"
                      style={{
                        borderColor: "#D1D1D1",
                        backgroundColor: "#F8F8F8",
                      }}
                    >
                      <Printer size={18} strokeWidth={2.2} />
                      <span>{selectedTask.service_name}</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="block text-[18px] font-semibold">
                      Spesifikasi
                    </label>

                    <div className="mt-2 flex flex-col gap-4">
                      {selectedTask.materials.map((material) => {
                        const draft = materialUsages.find(
                          (x) =>
                            x.queue_ticket_item_material_id ===
                            material.queue_ticket_item_material_id
                        );

                        return (
                          <div key={material.queue_ticket_item_material_id}>
                            <div
                              className="flex h-[46px] items-center gap-3 rounded-[14px] border px-4 text-[15px] font-medium"
                              style={{
                                borderColor: "#D1D1D1",
                                backgroundColor: "#F8F8F8",
                              }}
                            >
                              <FileText size={18} strokeWidth={2.2} />
                              <span>{material.specification_label}</span>
                            </div>

                            <div className="mt-2 text-[14px] font-medium text-[#7A7A7A]">
                              Planned: {material.qty_planned ?? 0} {material.unit}
                            </div>

                            <div className="mt-2">
                              <label className="block text-[18px] font-semibold">
                                Input Jumlah Pemakaian Bahan
                              </label>

                              <div
                                className="mt-2 flex overflow-hidden rounded-[14px] border"
                                style={{
                                  width: "170px",
                                  height: "50px",
                                  borderColor: "#D1D1D1",
                                  backgroundColor: "#F4F4F4",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    decreaseQty(
                                      material.queue_ticket_item_material_id,
                                      "qty_good"
                                    )
                                  }
                                  className="flex w-[42px] shrink-0 items-center justify-center text-[26px] font-medium"
                                >
                                  −
                                </button>

                                <input
                                  type="number"
                                  min={0}
                                  value={draft?.qty_good ?? 0}
                                  onChange={(e) =>
                                    handleMaterialQtyInput(
                                      material.queue_ticket_item_material_id,
                                      "qty_good",
                                      e.target.value
                                    )
                                  }
                                  className="min-w-0 flex-1 border-x border-[#D1D1D1] bg-white text-center text-[18px] font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    increaseQty(
                                      material.queue_ticket_item_material_id,
                                      "qty_good"
                                    )
                                  }
                                  className="flex w-[42px] shrink-0 items-center justify-center text-[26px] font-medium"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="block text-[18px] font-semibold">
                      File 
                    </label>

                    <div className="mt-2 flex flex-col gap-3">
                      {selectedTask.files?.length ? (
                        selectedTask.files.map((file) => (
                          <div
                            key={file.order_file_id}
                            className="rounded-[14px] border px-4 py-4"
                            style={{
                              borderColor: "#D1D1D1",
                              backgroundColor: "#F8F8F8",
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <FileText size={18} strokeWidth={2.2} className="mt-1 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="break-words text-[15px] font-semibold text-black">
                                  {file.original_file_name || file.stored_file_name || "File desain"}
                                </div>

                                {file.source_type === "LOCAL_UPLOAD" && (
                                  <>
                                    <div className="mt-1 text-[13px] text-[#7A7A7A]">
                                      Ukuran: {formatFileSize(file.file_size_bytes)}
                                    </div>

                                    {file.file_path && (
                                      <a
                                        href={`/api/order-files/view?path=${encodeURIComponent(file.file_path)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-block text-[14px] font-medium text-[#930000] underline"
                                      >
                                        Lihat / Download File
                                      </a>
                                    )}
                                  </>
                                )}

                                {file.source_type === "GDRIVE_LINK" && file.gdrive_url && (
                                  <a
                                    href={file.gdrive_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-block text-[14px] font-medium text-[#930000] underline"
                                  >
                                    Buka Google Drive
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          className="rounded-[14px] border px-4 py-3 text-[14px] text-[#7A7A7A]"
                          style={{
                            borderColor: "#D1D1D1",
                            backgroundColor: "#F8F8F8",
                          }}
                        >
                          Tidak ada file desain.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="block text-[18px] font-semibold">
                      Catatan
                    </label>

                    <input
                      type="text"
                      value={machineNote}
                      onChange={(e) => setMachineNote(e.target.value)}
                      placeholder="Bentuk Lingkaran"
                      className="mt-2 h-[48px] w-full rounded-[14px] border px-4 text-[15px] font-medium text-black outline-none"
                      style={{
                        borderColor: "#D1D1D1",
                        backgroundColor: "#F8F8F8",
                      }}
                    />
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleOpenConfirm}
                      disabled={submittingFinishId === selectedTask.id}
                      className="rounded-[16px] text-white transition hover:brightness-105 disabled:bg-gray-400"
                      style={{
                        width: "220px",
                        height: "52px",
                        background: "linear-gradient(90deg, #FF3D3D 0%, #930000 100%)",
                        fontSize: "18px",
                        fontWeight: 700,
                      }}
                    >
                      {submittingFinishId === selectedTask.id
                        ? "Menyimpan..."
                        : "Simpan & Proses Order"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-8 text-gray-500">Pilih order untuk diproses.</div>
              )}

              {message && (
                <div className="mt-6 text-[16px] font-medium text-red-600">
                  {message}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Modal */}
      {showConfirmModal && selectedTask && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
        <div
          className="w-full max-w-[700px] rounded-[32px] bg-white px-10 py-10 shadow-2xl"
          style={{
            minHeight: "360px",
          }}
        >
          <div className="flex justify-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: "70px",
                height: "70px",
              }}
            >
              <Info size={46} strokeWidth={2.4} />
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="text-3xl font-medium leading-tight">
              Konfirmasi Order {queueLabel(selectedTask.queue_number)}
            </div>
            <div className="mt-3 text-3xl font-medium leading-tight">
              Sudah Selesai?
            </div>
          </div>

          <div className="mt-14 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="rounded-[14px] text-white transition hover:brightness-105"
              style={{
                width: "190px",
                height: "58px",
                background: "linear-gradient(90deg, #FF4B4B 0%, #B40000 100%)",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              TIDAK
            </button>

            <button
              type="button"
              onClick={async () => {
                setShowConfirmModal(false);
                await handleFinishTask();
              }}
              className="rounded-[14px] text-white transition hover:brightness-105"
              style={{
                width: "190px",
                height: "58px",
                background: "linear-gradient(90deg, #FF4B4B 0%, #B40000 100%)",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              IYA
            </button>
          </div>
        </div>
      </div>
    )}
    </main>
  );
}