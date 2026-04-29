"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Settings, Trash2, User, Lock, Folder, Sun, X } from "lucide-react";
import OwnerPageShell from "@/components/owner/owner-page-shell";
import OwnerPageHeader from "@/components/owner/owner-page-header";

type UserRole = "OWNER" | "COUNTER_SERVICE" | "MACHINE" | "CASHIER";
type WorkShift = "PAGI" | "MALAM";

interface WorkerItem {
  user_id: number;
  full_name: string;
  username: string;
  role: UserRole;
  shift: WorkShift | null;
  is_active: boolean;
  created_at?: string;
}

type ModalMode = "create" | "edit";

interface WorkerFormState {
  full_name: string;
  username: string;
  password: string;
  role: UserRole | "";
  shift: WorkShift | "";
}

const CREATE_FORM_DEFAULT: WorkerFormState = {
  full_name: "",
  username: "",
  password: "",
  role: "",
  shift: "",
};

function getDivisionLabel(role: UserRole) {
  if (role === "COUNTER_SERVICE") return "Counter Service";
  if (role === "MACHINE") return "Machine";
  if (role === "CASHIER") return "Cashier";
  return "Owner";
}

function getShiftLabel(shift: WorkShift | null | "") {
  if (shift === "PAGI") return "Pagi";
  if (shift === "MALAM") return "Malam";
  return "-";
}

export default function OwnerHumanResourcePage() {
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedWorker, setSelectedWorker] = useState<WorkerItem | null>(null);

  const [form, setForm] = useState<WorkerFormState>(CREATE_FORM_DEFAULT);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadWorkers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/api/owner/users/list", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch workers");
      }

      setWorkers(data.items || []);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to fetch workers"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkers();
  }, []);

  const filteredWorkers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return workers;

    return workers.filter((worker) =>
      `${worker.full_name} ${worker.username} ${getDivisionLabel(
        worker.role
      )} ${getShiftLabel(worker.shift)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [workers, search]);

  const pagiWorkers = useMemo(
    () => workers.filter((worker) => worker.shift === "PAGI"),
    [workers]
  );

  const malamWorkers = useMemo(
    () => workers.filter((worker) => worker.shift === "MALAM"),
    [workers]
  );

  const machineWorkers = useMemo(
    () => workers.filter((worker) => worker.role === "MACHINE"),
    [workers]
  );

  function openCreateModal() {
    setModalMode("create");
    setSelectedWorker(null);
    setForm(CREATE_FORM_DEFAULT);
    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(true);
  }

  function openEditModal(worker: WorkerItem) {
    setModalMode("edit");
    setSelectedWorker(worker);
    setForm({
      full_name: worker.full_name,
      username: worker.username,
      password: "",
      role: worker.role,
      shift: worker.shift || "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    setSelectedWorker(null);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function updateForm(field: keyof WorkerFormState, value: string) {
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

      if (!form.username.trim()) {
        throw new Error("Username wajib diisi.");
      }

      if (!form.full_name.trim()) {
        throw new Error("Nama worker wajib diisi.");
      }

      if (modalMode === "create" && !form.password.trim()) {
        throw new Error("Password wajib diisi.");
      }

      if (!form.role) {
        throw new Error("Divisi wajib dipilih.");
      }

      if (!form.shift) {
        throw new Error("Shift wajib dipilih.");
      }

      if (modalMode === "create") {
        const payload = {
          username: form.username.trim(),
          full_name: form.full_name.trim(),
          password: form.password.trim(),
          role: form.role,
          shift: form.shift,
        };

        const res = await fetch("/api/owner/users/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to create worker");
        }

        setSuccessMessage("Karyawan berhasil ditambahkan.");
      } else {
        if (!selectedWorker) {
          throw new Error("Data worker tidak ditemukan.");
        }

        const payload = {
          username: form.username.trim(),
          full_name: form.full_name.trim(),
          role: form.role,
          shift: form.shift,
        };

        const res = await fetch(`/api/owner/users/${selectedWorker.user_id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to update worker");
        }

        setSuccessMessage("Data karyawan berhasil diperbarui.");
      }

      await loadWorkers();

      setTimeout(() => {
        closeModal();
      }, 500);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save worker"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      if (!selectedWorker) return;

      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const res = await fetch(`/api/owner/users/${selectedWorker.user_id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete worker");
      }

      await loadWorkers();
      closeModal();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete worker"
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

          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/90 shadow-sm">
            <div className="flex items-center justify-between px-7 py-5">
              <div className="text-[28px] font-semibold text-black">
                Daftar Pekerja
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-[58px] w-[320px] items-center rounded-full border border-black/15 bg-white px-6">
                  <Search size={22} className="mr-3 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari Worker..."
                    className="w-full bg-transparent text-[18px] outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  onClick={openCreateModal}
                  className="flex h-[58px] items-center gap-2 rounded-full bg-gradient-to-r from-[#FF3A3A] to-[#B30000] px-8 text-[20px] font-semibold text-white shadow-sm"
                >
                  <Plus size={22} />
                  <span>Worker</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[2.2fr_1.6fr_1fr_1fr] bg-gradient-to-r from-[#FF3A3A] to-[#B30000] px-7 py-4 text-[20px] font-semibold text-white">
              <div>Pekerja</div>
              <div>Divisi</div>
              <div>Shift</div>
              <div>Edit Profile</div>
            </div>

            {loading ? (
              <div className="px-7 py-10 text-[18px] text-gray-500">
                Loading workers...
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="px-7 py-10 text-[18px] text-gray-500">
                Tidak ada data pekerja.
              </div>
            ) : (
              <div>
                {filteredWorkers.map((worker, index) => (
                  <div
                    key={worker.user_id}
                    className="grid grid-cols-[2.2fr_1.6fr_1fr_1fr] items-center border-b border-black/10 px-7 py-6"
                  >
                    <div className="flex items-center gap-4 pr-6">
                      <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-2 border-black/40 text-[20px]">
                        <User size={24} />
                      </div>

                      <div className="min-w-0">
                        <div className="text-[18px] leading-tight text-black/70">
                          Pekerja{index + 1}
                        </div>
                        <div className="text-[24px] font-semibold leading-snug text-black">
                          {worker.full_name}
                        </div>
                      </div>
                    </div>

                    <div className="text-[24px] font-medium text-black">
                      {getDivisionLabel(worker.role)}
                    </div>

                    <div className="text-[24px] font-medium text-black">
                      {getShiftLabel(worker.shift)}
                    </div>

                    <div>
                      <button
                        onClick={() => openEditModal(worker)}
                        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF3A3A] to-[#B30000] px-8 py-3 text-[18px] font-semibold text-white"
                      >
                        <Pencil size={18} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 text-black">
          <div className="w-full max-w-[1130px] rounded-[34px] bg-white px-8 py-7 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-black/10 pb-6">
              <div className="flex items-center gap-4">
                <Settings size={38} strokeWidth={2.2} />
                <h2 className="text-[32px] font-semibold text-black">
                  {modalMode === "create"
                    ? "Penambahan Karyawan"
                    : "Edit Data Karyawan"}
                </h2>
              </div>

              <button
                onClick={closeModal}
                className="text-black/80"
              >
                <X size={38} strokeWidth={2.2} />
              </button>
            </div>

            <div className="rounded-[24px] border border-black/10 px-10 py-8">
              <div className="space-y-7">
                <HRField
                  icon={<User size={26} strokeWidth={2.1} />}
                  label="Username"
                  input={
                    <input
                      value={form.username}
                      onChange={(e) => updateForm("username", e.target.value)}
                      placeholder="Masukkan Username"
                      className="w-full bg-transparent px-7 py-5 text-[18px] outline-none placeholder:text-black/25"
                    />
                  }
                />

                <HRField
                  icon={<User size={26} strokeWidth={2.1} />}
                  label="Nama Worker"
                  input={
                    <input
                      value={form.full_name}
                      onChange={(e) => updateForm("full_name", e.target.value)}
                      placeholder="Masukkan Nama Lengkap"
                      className="w-full bg-transparent px-7 py-5 text-[18px] outline-none placeholder:text-black/25"
                    />
                  }
                />

                {modalMode === "create" && (
                  <HRField
                    icon={<Lock size={26} strokeWidth={2.1} />}
                    label="Password"
                    input={
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        placeholder="Masukkan Kata Sandi"
                        className="w-full bg-transparent px-7 py-5 text-[18px] outline-none placeholder:text-black/25"
                      />
                    }
                  />
                )}

                <HRField
                  icon={<Folder size={26} strokeWidth={2.1} />}
                  label="Divisi"
                  input={
                    <select
                      value={form.role}
                      onChange={(e) => updateForm("role", e.target.value)}
                      className="w-full appearance-none bg-transparent px-7 py-5 text-[18px] outline-none"
                    >
                      <option value="">Pilih Divisi Karyawan</option>
                      <option value="COUNTER_SERVICE">Counter Service</option>
                      <option value="MACHINE">Machine</option>
                      <option value="CASHIER">Cashier</option>
                    </select>
                  }
                  hasDropdown
                />

                <HRField
                  icon={<Sun size={26} strokeWidth={2.1} />}
                  label="Shift"
                  input={
                    <select
                      value={form.shift}
                      onChange={(e) =>
                        updateForm("shift", e.target.value as WorkShift)
                      }
                      className="w-full appearance-none bg-transparent px-7 py-5 text-[18px] outline-none"
                    >
                      <option value="">Pilih Shift Karyawan</option>
                      <option value="PAGI">Pagi</option>
                      <option value="MALAM">Malam</option>
                    </select>
                  }
                  hasDropdown
                />

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

            <div className="mt-8 flex items-center justify-between px-4">
              <button
                onClick={handleDelete}
                disabled={submitting || modalMode === "create"}
                className="flex min-w-[250px] items-center justify-center gap-3 rounded-[20px] bg-gradient-to-r from-[#FF3A3A] to-[#B30000] px-10 py-4 text-[20px] font-semibold text-white shadow-sm disabled:opacity-50"
              >
                <Trash2 size={24} />
                <span>Hapus</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex min-w-[250px] items-center justify-center gap-3 rounded-[20px] bg-gradient-to-r from-[#FF3A3A] to-[#B30000] px-10 py-4 text-[20px] font-semibold text-white shadow-sm disabled:opacity-60"
              >
                <Pencil size={22} />
                <span>{submitting ? "Menyimpan..." : "Simpan"}</span>
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
  return (
    <div className="rounded-[24px] bg-gradient-to-r from-[#FF3A3A] to-[#B30000] px-8 py-6 text-white shadow-sm">
      <div className="mb-4 text-[22px] font-semibold">{title}</div>
      <div className="text-[60px] font-bold leading-none">{value}</div>

      {subtitle ? (
        <div className="mt-4 inline-flex rounded-full bg-white/20 px-4 py-1 text-[14px] font-medium">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function HRField({
  icon,
  label,
  input,
  hasDropdown = false,
}: {
  icon: React.ReactNode;
  label: string;
  input: React.ReactNode;
  hasDropdown?: boolean;
}) {
  return (
    <div className="grid grid-cols-[260px_1fr] overflow-hidden rounded-[22px] border border-black/12">
      <div className="flex items-center gap-4 border-r border-black/10 px-5 text-[18px] font-semibold text-black">
        <span className="flex h-[28px] w-[28px] items-center justify-center">
          {icon}
        </span>
        <span>{label}</span>
      </div>

      <div className="relative">
        {input}

        {hasDropdown && (
          <div className="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 text-[22px] text-black">
            ˅
          </div>
        )}
      </div>
    </div>
  );
}