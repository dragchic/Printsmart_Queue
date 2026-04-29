"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Search, Download } from "lucide-react";
import OwnerPageShell from "@/components/owner/owner-page-shell";
import OwnerPageHeader from "@/components/owner/owner-page-header";

type CustomerRow = {
  customer_id: number;
  no: number;
  name: string;
  phone_number: string;
  service_types: string;
};

export default function OwnerDataPelangganPage() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");


  async function loadCustomers() {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await fetch("/api/customers", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch customers");
      }

      setRows(data.items || []);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to fetch customers"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCustomer(customerId: number, customerName: string) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus data pelanggan "${customerName}"? Data antrean dan order terkait juga akan terhapus.`
    );
  
    if (!confirmed) return;
  
    try {
      setLoading(true);
  
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });
  
      const data = await res.json().catch(() => ({}));
  
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menghapus pelanggan");
      }
  
      await loadCustomers();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus pelanggan"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((row) =>
      `${row.name} ${row.phone_number} ${row.service_types}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [rows, search]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/customers/export");
  
      if (!res.ok) {
        throw new Error("Failed to download");
      }
  
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
  
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
  
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Gagal download data");
    }
  };

  return (
    <OwnerPageShell ownerName="Owner1">
      <main className="flex-1 px-12 py-10 text-black">
        <OwnerPageHeader title="Management Dashboard" />

        <div className="rounded-[34px] border border-black/10 bg-white/5 p-10 shadow-sm backdrop-blur-[2px]">
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/90 shadow-sm">
            <div className="flex items-center justify-between px-7 py-5">
              <div className="text-[28px] font-semi text-black">
                Database Pelanggan
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-[66px] w-[320px] items-center rounded-[24px] border border-black/15 bg-white px-6">
                  <Search size={22} className="mr-3 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari Order..."
                    className="w-full bg-transparent text-[18px] outline-none placeholder:text-gray-400"
                  />
                </div>

                <button
                  onClick={handleDownload}
                  className="flex h-[66px] w-[74px] items-center justify-center rounded-[24px] border border-black/15 bg-white text-[#7A7A7A] shadow-sm transition hover:bg-black/5"
                  aria-label="Export to CSV"
                  title="Export to CSV"
                >
                  <Download size={30} strokeWidth={2.1} />
                </button>

                <div className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-20 -translate-x-1/2 rounded-xl bg-black px-3 py-2 text-sm font-medium text-white opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100">
                    Export to CSV
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[0.5fr_1.2fr_1.3fr_1.8fr_0.6fr] items-center bg-gradient-to-r from-[#FF3A3A] to-[#B30000] px-7 py-4 text-[20px] font-semibold text-white">
              <div>No.</div>
              <div>Nama</div>
              <div>No. HP</div>
              <div>Tipe Layanan</div>
              <div className="text-center">Aksi</div>
            </div>

            {loading ? (
              <div className="px-7 py-10 text-[18px] text-gray-500">
                Loading customers...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="px-7 py-10 text-[18px] text-gray-500">
                Tidak ada data pelanggan.
              </div>
            ) : (
              <div>
                {filteredRows.map((row) => (
                  <div
                    key={row.customer_id}
                    className="grid grid-cols-[0.5fr_1.2fr_1.3fr_1.8fr_0.6fr] items-center border-b border-black/10 px-7 py-7"
                  >
                    <div className="text-[22px] font-medium text-black">
                      {row.no}
                    </div>

                    <div className="pr-6 text-[22px] font-medium text-black">
                      {row.name}
                    </div>

                    <div className="pr-6 text-[22px] font-medium text-black">
                      {row.phone_number}
                    </div>

                    <div className="pr-4 text-[22px] font-medium leading-snug text-black">
                      {row.service_types}
                    </div>

                    <div className="flex items-center justify-center h-full">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(row.customer_id, row.name)}
                        className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-gradient-to-r from-[#FF3A3A] to-[#B30000] text-white shadow-sm transition hover:scale-105"
                        title="Hapus pelanggan"
                      >
                        <Trash2 size={24} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMessage}
            </div>
          )}
        </div>
      </main>
    </OwnerPageShell>
  );
}