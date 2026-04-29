"use client";

import { useEffect, useState, useMemo } from "react";
import OwnerPageShell from "@/components/owner/owner-page-shell";
import OwnerPageHeader from "@/components/owner/owner-page-header";
import { IdCard, Hourglass, RefreshCw, Search, Calendar } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

const COLORS = [
  "#6cdcda",
  "#446B9E",
  "#4DC153",
  "#F5A623",
  "#8E7CC3",
];

export default function DashboardPage() {
  const [serviceStats, setServiceStats] = useState<any[]>([]);
  const [customerStats, setCustomerStats] = useState<any[]>([]);
  const [serviceRange, setServiceRange] = useState(7);
  const [range, setRange] = useState(7);
  const [loading, setLoading] = useState(true);

  // NEW SUMMARY STATE
  const [summary, setSummary] = useState({
    selesai: 0,
    antrian: 0,
    proses: 0,
  });

  const [newService, setNewService] = useState("");
  const [adding, setAdding] = useState(false);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);


  // SUMMARY CALCULATION
  function toJakartaDateString(value: string | Date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  }
  
  function calculateSummary(customers: any[]) {
    let selesai = 0;
    let antrian = 0;
    let proses = 0;
  
    const todayStr = toJakartaDateString(new Date());
  
    customers.forEach((c) => {
      c.queue_tickets?.forEach((ticket: any) => {
        // Order selesai
        if (ticket.status === "DONE" && ticket.finished_at) {
          if (toJakartaDateString(ticket.finished_at) === todayStr) {
            selesai++;
          }
          return;
        }
  
        // Dalam antrean 
        if (ticket.status === "WAITING") {
          const rawDate = ticket.created_at;
          if (rawDate && toJakartaDateString(rawDate) === todayStr) {
            antrian++;
          }
          return;
        }
  
        // Dalam proses 
        if (ticket.status === "SERVING") {
          const rawDate = ticket.created_at;
          if (rawDate && toJakartaDateString(rawDate) === todayStr) {
            proses++;
          }
        }
      });
    });
  
    return { selesai, antrian, proses };
  }

  async function fetchData() {
    try {
      setLoading(true);

      const [serviceRes, customerRes] = await Promise.all([
        fetch("/api/service-options"),
        fetch("/api/customers"),
      ]);

      const serviceData = await serviceRes.json();
      const customerData = await customerRes.json();

      setServiceStats(serviceData?.items ?? []);
      setCustomerStats(customerData?.items ?? []);

      // SET SUMMARY
      const summaryData = calculateSummary(customerData?.items ?? []);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleAddService() {
    if (!newService.trim()) return;

    try {
      setAdding(true);

      await fetch("/api/owner/service-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newService }),
      });

      setNewService("");
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  const pieData = useMemo(() => {
  const now = new Date();
  const from = new Date();
  from.setDate(now.getDate() - serviceRange);

  const map: Record<string, number> = {};

  customerStats.forEach((customer) => {
    (customer.queue_tickets || []).forEach((ticket: any) => {
      if (!ticket.created_at) return;

      const date = new Date(ticket.created_at);
      if (date < from) return;

      (ticket.items || []).forEach((item: any) => {
        const name =
          item.service_option?.name ||
          item.custom_service_name ||
          "Other";

        map[name] = (map[name] || 0) + 1;
      });
    });
  });

  return Object.entries(map).map(([name, value]) => ({
    name,
    value,
  }));
}, [customerStats, serviceRange]);

  function getCustomerChartData(customers: any[]) {
    const map: Record<string, number> = {};

    customers.forEach((c) => {
      const services = c.service_types?.split(",") || [];

      services.forEach((s: string) => {
        const key = s.trim();
        if (!key || key === "-") return;

        map[key] = (map[key] || 0) + 1;
      });
    });

    return Object.entries(map).map(([name, total]) => ({
      name,
      total,
    }));
  }
const queueStats = useMemo(() => {
  const now = new Date();
  const from = new Date();
  from.setDate(now.getDate() - range);

  const map = new Map<string, number>();

  customerStats.forEach((customer) => {
    (customer.queue_tickets || []).forEach((ticket: any) => {
      if (!ticket.created_at) return;

      const date = new Date(ticket.created_at);

      if (date >= from) {
        const key = date.toISOString().split("T")[0];
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
  });

  return Array.from(map.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}, [customerStats, range]);

  const chartData = getCustomerChartData(customerStats);

  return (
    <OwnerPageShell ownerName="Owner1">
      <div className="flex-1 px-12 py-10 text-black">
        <OwnerPageHeader title="Management Dashboard" />

        <div className="rounded-[34px] border border-black/10 bg-white/5 p-10 shadow-sm backdrop-blur-[2px]">

          {/* TOP CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E53935] to-[#8E0000] p-6 text-white h-[220px] flex flex-col justify-between">
              <IdCard size={250} className="absolute right-8 top-1/2 -translate-y-1/2 text-white opacity-10" />
              <div className="text-3xl z-10">Order Selesai</div>
              <div className="text-8xl z-10">
                {loading ? "-" : summary.selesai}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E53935] to-[#8E0000] p-6 text-white h-[220px] flex flex-col justify-between">
              <Hourglass size={200} className="absolute right-8 top-1/2 -translate-y-1/2 text-white opacity-10" />
              <div className="text-3xl z-10">Dalam Antrian</div>
              <div className="text-8xl z-10">
                {loading ? "-" : summary.antrian}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E53935] to-[#8E0000] p-6 text-white h-[220px] flex flex-col justify-between">
              <RefreshCw size={200} className="absolute right-6 top-1/2 -translate-y-1/2 text-white opacity-10" />
              <div className="text-3xl z-10">Dalam Proses</div>
              <div className="text-8xl z-10">
                {loading ? "-" : summary.proses}
              </div>
            </div>

          </div>
          {/* MIDDLE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

            {/* LEFT - JANGAN DIUBAH */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md p-6 border border-white/40 shadow-sm">
              <div className="flex justify-between items-center mb-6">
              <div className="font-semibold text-black text-lg">
                Tipe Layanan
              </div>

              <div className="relative">
                <select
                  value={serviceRange}
                  onChange={(e) => setServiceRange(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                >
                  <option value={7}>7 Hari</option>
                  <option value={14}>14 Hari</option>
                  <option value={30}>30 Hari</option>
                </select>

                <div className="flex items-center gap-3 rounded-[10px] border border-[#E5E5E5] bg-[#FFFFFF] px-6 py-2 shadow-sm">
                  <Calendar size={22} className="text-black/70" />

                  <span className="text-sm font-medium text-black/70">
                    {serviceRange === 7 && "7 Hari"}
                    {serviceRange === 14 && "14 Hari"}
                    {serviceRange === 30 && "30 Hari"}
                  </span>
                </div>
              </div>
            </div>

              <div className="flex flex-col items-center justify-center h-[260px]">
                {loading ? (
                  <div className="text-black/40">Loading...</div>
                ) : pieData.length === 0 ? (
                  <div className="text-black/40">No Data</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={90}
                          innerRadius={40}
                        >
                          {pieData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="mt-4 flex flex-wrap gap-3 justify-center">
                      {pieData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-black">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT - UPDATED */}
            <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/40 shadow-sm overflow-hidden">

              <div className="flex justify-between items-center px-6 py-5">
                <div className="font-semibold text-black text-lg">
                  Daftar Tipe Layanan
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari Tipe Layanan..."
                      className="pl-9 pr-4 py-2 rounded-full border border-black/10 bg-white/80 text-sm text-black"
                    />
                  </div>

                  <button
                    onClick={() => setShowModal(true)}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-[#E53935] to-[#8E0000] text-white text-sm"
                  >
                    + Layanan
                  </button>
                </div>
              </div>

              <div className="flex justify-between px-6 py-3 bg-gradient-to-r from-[#E53935] to-[#8E0000] text-white text-sm font-medium">
                <span>Nama Layanan</span>
                <span>Edit Layanan</span>
              </div>

              <div className="max-h-[220px] overflow-y-auto">
                {serviceStats
                  .filter((item) =>
                    item.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center px-6 py-4 border-b border-black/10"
                    >
                      <span className="text-black font-medium">
                        {item.name}
                      </span>

                      <button
                        onClick={() => {
                          setSelectedService(item);
                          setShowActionModal(true);
                        }}
                        className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#E53935] to-[#8E0000] text-white text-sm"
                      >
                        ✎ Edit
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* BOTTOM - JANGAN DIUBAH */}
          <div className="rounded-2xl bg-white/80 backdrop-blur-md p-6 border border-white/40 shadow-sm">


          <div className="flex justify-between items-center mb-4">
          <div className="font-semibold text-black text-lg">
            Statistik Pelanggan
          </div>
        <div className="relative">
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        >
          <option value={7}>7 Hari</option>
          <option value={14}>14 Hari</option>
          <option value={30}>30 Hari</option>
        </select>

      <div className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-[#FFFFFF] px-6 py-2 shadow-sm">

      <Calendar size={22} className="text-black/70" />

        <span className="text-sm font-medium text-black/70">
          {range === 7 && "7 Hari"}
          {range === 14 && "14 Hari"}
          {range === 30 && "30 Hari"}
        </span>

      </div>
      </div>
    </div>
            <div className="h-[260px]">
              {loading ? (
                <div className="flex justify-center items-center h-full text-black/40">
                  Loading...
                </div>
              ) : queueStats.length === 0 ? (
                <div className="flex justify-center items-center h-full text-black/40">
                  No Data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={queueStats}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#FF3A3A"
                    strokeWidth={3}
                  />
                </LineChart>
                </ResponsiveContainer>
              )}
              </div>
          </div>
        </div>

        </div>

        {/* MODAL ADD */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-[400px]">
              <div className="text-xl text-black font-semibold mb-4">
                Tambah Layanan
              </div>

              <input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl mb-4 text-black"
              />

              <div className="flex justify-end gap-3 text-black">
                <button onClick={() => setShowModal(false)}>Batal</button>
                <button
                  onClick={handleAddService}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ACTION */}
        {showActionModal && selectedService && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-[350px] text-center">

              <div className="text-lg text-black font-semibold mb-6">
                Pilih Aksi
              </div>

              <div className="flex flex-col gap-3">

                <button
                  onClick={() => {
                    setEditName(selectedService.name);
                    setShowActionModal(false);
                    setShowEditModal(true);
                  }}
                  className="py-2 rounded-xl bg-blue-500 text-white"
                >
                  ✏️ Edit Nama
                </button>

                <button
                  onClick={async () => {
                    if (!confirm("Yakin hapus layanan ini?")) return;

                    await fetch(`/api/service-options/${selectedService.service_option_id}`, {
                      method: "DELETE",
                    });

                    setShowActionModal(false);
                    fetchData();
                  }}
                  className="py-2 rounded-xl bg-red-500 text-white"
                >
                  🗑 Delete
                </button>

                <button
                  onClick={() => setShowActionModal(false)}
                  className="py-2 text-black rounded-xl border"
                >
                  Batal
                </button>

              </div>
            </div>
          </div>
        )}

        {/* MODAL EDIT */}
        {showEditModal && selectedService && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl w-[400px]">

              <div className="text-lg font-semibold mb-4">
                Edit Layanan
              </div>

              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl mb-4"
              />

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowEditModal(false)}>
                  Batal
                </button>

                <button
                  onClick={async () => {
                    await fetch(`/api/service-options/${selectedService.service_option_id}`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ name: editName }),
                    });

                    setShowEditModal(false);
                    fetchData();
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      <div>
    </div>
    </OwnerPageShell>
  );
}