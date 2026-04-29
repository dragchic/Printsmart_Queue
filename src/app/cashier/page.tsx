"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Search, RefreshCcw, LogOut, Clock, X, Minimize2 } from "lucide-react";
import { useRouter } from "next/navigation";
import WorkerPageHeader from "@/components/worker/worker-page-header";

/* =========================
   TYPE DATA
========================= */
type Tab = "not_taken" | "taken" | "expired";

type Order = {
  ticket_id: number;
  queue_number: number;
  pickup_status: string;
  pickup_ready_at?: string;
  picked_up_at?: string;
  expired_at?: string;
  customer: {
    name: string;
    phone_number: string;
  };
  products: {
    id: number;
    name: string;
    qty: number;
  }[];
};

export default function CashierPage() {
  const [tab, setTab] = useState<Tab>("not_taken");
  const [items, setItems] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const [isMinimized, setIsMinimized] = useState(false);
  const [notifications, setNotifications] = useState<Order[]>([]);
  const [closedIds, setClosedIds] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cashier/orders?tab=${tab}&q=${q}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  const delayDebounce = setTimeout(() => {
    fetchData();
  }); // biar gak spam API

  return () => clearTimeout(delayDebounce);
}, [tab, q]);

useEffect(() => {
  const filtered = items.filter(
    (item) => !closedIds.includes(item.ticket_id)
  );
  setNotifications(filtered);
}, [items, closedIds]);

useEffect(() => {
  const saved = localStorage.getItem("closed_notifications");
  if (saved) {
    setClosedIds(JSON.parse(saved));
  }
}, []);

useEffect(() => {
  localStorage.setItem("closed_notifications", JSON.stringify(closedIds));
}, [closedIds]);

  // SSE
  useEffect(() => {
    const es = new EventSource("/api/tickets/stream");

    es.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (
          msg.type === "waiting_changed" ||
          msg.type === "machine_task_changed" ||
          msg.type === "pickup_changed" ||
          msg.type === "cs_notification"
        ) {
          fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => es.close();
  }, [tab, q]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function markTaken(ticket_id: number) {
    if (!confirm("Tandai order ini sudah diambil?")) return;

    try {
      await fetch("/api/cashier/orders/mark-taken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id }),
      });

      fetchData();
    } catch (e) {
      console.error(e);
    }
  }
  
  async function handleRefresh() {
  setRefreshing(true);
  setQ("");

  try {
    await fetchData();
  } finally {
    setTimeout(() => setRefreshing(false), 100); 
  }
}

async function confirmMarkTaken() {
  if (!selectedTicket) return;

  try {
    await fetch("/api/cashier/orders/mark-taken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticket_id: selectedTicket }),
    });

    setShowConfirm(false);
    setSelectedTicket(null);
    fetchData();
  } catch (e) {
    console.error(e);
  }
}

  function formatQueue(num: number) {
    return `A-${String(num).padStart(3, "0")}`;
  }

  function formatTime(date?: string) {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB";
  }

  function closeNotification(id: number) {
    setClosedIds((prev) => [...prev, id]);

    setNotifications((prev) =>
      prev.filter((item) => item.ticket_id !== id)
    );
  }

  return (
    <main
    
    className="relative min-h-screen px-10 py-6 text-black"     
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.1), rgba(255,146,146,0.2)), url('/pg-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >

      <div className="absolute top-[120px] right-10 z-20">
        <button
        onClick={handleLogout}
        className="
          flex shrink-0 items-center justify-center gap-2
          rounded-[20px] border border-[#CCCCCC]
          bg-[rgba(250,245,251,0.10)]
          text-[#ED2021]
          transition-all duration-200

          hover:bg-[#FFF1F1]
          hover:shadow-sm

          active:border-transparent
          active:bg-gradient-to-r
          active:from-[#FF3D3D]
          active:to-[#930000]
          active:text-white
          active:shadow-sm
          active:scale-[0.98]
        "
        style={{
          width: "160px",
          height: "55px",
          fontSize: "20px",
          fontWeight: 500,
        }}
      >
        <LogOut size={26} />
        Log Out
      </button>
      </div>

      {/* HEADER ATAS */}
      <div className="relative z-10">
        <WorkerPageHeader
          role="Cashier Worker"
          name={user?.full_name || user?.username || ""}
        />
      </div>

      {/* TAB FILTER */}
      <div className="relative z-10 mt-6 flex items-center gap-4">

        <button
          onClick={() => setTab("not_taken")}
          className={`flex items-center justify-center rounded-xl border text-xl font-medium transition ${
            tab === "not_taken"
              ? "border-transparent bg-gradient-to-r from-[#FF3D3D] to-[#930000] text-white shadow-sm"
              : "border border-[#CCCCCC] bg-[#FAF5FB]/80 text-black hover:bg-[#FFF1F1] hover:shadow-sm"
          }`}
          style={{ width: "170px", height: "46px" }}
        >
          Belum Diambil
        </button>

        <button
          onClick={() => setTab("taken")}
          className={`flex items-center justify-center rounded-xl border text-xl font-medium transition ${
            tab === "taken"
              ? "border-transparent bg-gradient-to-r from-[#FF3D3D] to-[#930000] text-white shadow-sm"
              : "border border-[#CCCCCC] bg-[#FAF5FB]/80 text-black hover:bg-[#FFF1F1] hover:shadow-sm"
          }`}
          style={{ width: "170px", height: "46px" }}
        >
          Sudah Diambil
        </button>

        <button
          onClick={() => setTab("expired")}
          className={`flex items-center justify-center rounded-xl border text-xl font-medium transition ${
            tab === "expired"
              ? "border-transparent bg-gradient-to-r from-[#FF3D3D] to-[#930000] text-white shadow-sm"
              : "border border-[#CCCCCC] bg-[#FAF5FB]/80 text-black hover:bg-[#FFF1F1] hover:shadow-sm"
          }`}
          style={{ width: "170px", height: "46px" }}
        >
          Kadaluarsa
        </button>

      </div>

      {/* GRID LAYOUT */}
      <div className="relative z-10 mt-6 grid grid-cols-12 gap-6">

        <div className="col-span-8">

          {/* WRAPPER CARD */}
          <div className="col-span-8">
            <div
              className="rounded-2xl border backdrop-blur-md"
              style={{
                backgroundColor: "rgba(255,255,255,0)",
                borderColor: "#D7D7D7",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >

            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-xl font-semibold">
                List Order Pelanggan
              </h2>

              <div className="flex items-center gap-3">
                {/* SEARCH */}
                <div
                  className="flex items-center gap-3 rounded-2xl px-4"
                  style={{
                    height: "50px",
                    width: "220px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #D0D0D0",
                  }}
                >
                  <Search size={22} color="#7F7F7F" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari Order..."
                    className="w-full bg-transparent outline-none text-l"
                  />
                </div>

                {/* REFRESH */}
                <button
                  onClick={handleRefresh}
                  className="flex items-center justify-center rounded-xl border transition"
                  style={{
                    height: "50px",
                    width: "50px",
                    backgroundColor: "#ffffff",
                    borderColor: "#D0D0D0",
                  }}
                >
                  <RefreshCcw
                    size={22}
                    className={`text-[#7F7F7F]`}
                  />
                </button>
              </div>
            </div>

            {/* HEADER TABLE */}
            <div className="grid grid-cols-5 px-6 py-3 text-white font-medium"
              style={{
                background: "linear-gradient(90deg, #FF3D3D 0%, #930000 100%)"
              }}
            >
              <div>ID</div>
              <div>Nama</div>
              <div>Nomor</div>
              <div>Product</div>
              <div></div>
            </div>

            {/* DATA ROW */}
            <div
              className="px-6 py-4"
              style={{
                backgroundColor: "rgba(255,255,255,0.8)",
                minHeight: "500px", // 🔥 ini yang bikin full ke bawah
                borderBottomLeftRadius: "16px",
                borderBottomRightRadius: "16px",
              }}
            >
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-gray-400 font-medium">
                  Tidak ada data
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={item.ticket_id}>
                    
                    {/* ROW */}
                    <div className="grid grid-cols-5 items-center py-4 font-semibold hover:bg-white/60 transition rounded-xl px-2">
                      <div>{formatQueue(item.queue_number)}</div>
                      <div>{item.customer.name}</div>
                      <div>{item.customer.phone_number}</div>
                      <div>{item.products.map((p) => p.name).join(", ")}</div>

                      <div className="flex justify-end">
                        {tab === "not_taken" && (
                          <button
                            onClick={() => {
                              setSelectedTicket(item.ticket_id);
                              setShowConfirm(true);
                            }}
                            className="flex items-center gap-2 rounded-[8px] px-4 py-3 text-white"
                            style={{
                              background: "linear-gradient(90deg, #FF4B4B 0%, #B40000 100%)",
                              fontSize: "15px",
                              fontWeight: 600,
                              boxShadow: "0 2px 6px rgba(237,32,33,0.25)",
                            }}
                          >
                            ✓ Sudah Diambil
                          </button>
                        )}

                        {tab === "taken" && (
                          <span className="text-green-600 font-semibold">
                            ✔ Diambil
                          </span>
                        )}

                        {tab === "expired" && (
                          <span className="text-gray-500 font-semibold">
                            Kadaluarsa
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ✅ DIVIDER (lebih clean & soft) */}
                    {index !== items.length - 0 && (
                      <div
                        className="mx-2"
                        style={{
                          height: "1px",
                          background: "linear-gradient(to right, #cdcdcd)",
                        }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

        {/* RIGHT PANEL NOTIF */}
        <div className="col-span-4">
  
          {/* OUTER GLASS WRAPPER */}
          <div
            className="rounded-[34px] border border-black/10 bg-white/5 p-10 shadow-sm backdrop-blur-[2px]"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0)",
              borderColor: "rgba(178, 178, 178, 0.4)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
            }}
          >

            {/* HEADER */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">
                Notifikasi Selesai
              </h2>

              {/* ICON BUTTON */}
              <div
                className="w-12 h-12 flex items-center justify-center rounded-xl border cursor-pointer"
                style={{
                  backgroundColor: "rgba(255,255,255,0.6)",
                  borderColor: "#D0D0D0",
                }}
              >
                <Minimize2
                  size={22}
                  color="#7F7F7F"
                  onClick={() => setIsMinimized(!isMinimized)}
                />
              </div>
            </div>

            {/* LIST NOTIF */}
              {!isMinimized && (
                <div className="space-y-4">
                  {notifications.slice(0, 5).map((item) => (
                    <div
                      key={item.ticket_id}
                      className="p-4 rounded-2xl backdrop-blur-xl border relative"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        borderColor: "#E5E5E5",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                      }}
                    >
                      {/* TOP */}
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            {formatQueue(item.queue_number)}
                          </span>

                          <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">
                            Tipe Orderan
                          </span>
                        </div>

                        <X
                          size={16}
                          className="text-gray-600 cursor-pointer hover:text-red-500"
                          onClick={() => closeNotification(item.ticket_id)}
                        />
                      </div>

                      <div className="mt-3 text-2xl font-semibold">
                        {item.customer.name}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                        <Clock size={14} />
                        {formatTime(item.pickup_ready_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div
              className="w-full max-w-[600px] rounded-[20px] px-10 py-10 text-center"
              style={{
                backgroundColor: "#F4F4F4",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              }}
            >
              {/* ICON */}
              <div className="flex justify-center">
                <div
                  className="flex items-center justify-center rounded-full border-4 border-black"
                  style={{
                    width: "64px",
                    height: "64px",
                  }}
                >
                  <span className="text-[36px] font-bold">i</span>
                </div>
              </div>

              {/* TEXT */}
              <div className="mt-6 leading-tight">
                <div className="text-[25px] font-semibold text-black">
                  Konfirmasi Order{" "}
                  <span className="font-semibold">
                    {selectedTicket
                      ? `A-${String(
                          items.find((i) => i.ticket_id === selectedTicket)?.queue_number
                        ).padStart(3, "0")}`
                      : ""}
                  </span>
                </div>

                <div className="mt-2 text-[25px] font-semibold text-black">
                  Sudah Diambil Oleh Pelanggan?
                </div>
              </div>

              {/* BUTTON */}
              <div className="mt-10 flex justify-center gap-6">
                {/* TIDAK */}
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-[8px] text-white font-semibold transition hover:brightness-105"
                  style={{
                    width: "150px",
                    height: "48px",
                    background: "linear-gradient(90deg, #FF5A5A 0%, #C40000 100%)",
                    fontSize: "16px",
                  }}
                >
                  TIDAK
                </button>

                {/* IYA */}
                <button
                  onClick={confirmMarkTaken}
                  className="rounded-[8px] text-white font-semibold transition hover:brightness-105"
                  style={{
                    width: "150px",
                    height: "48px",
                    background: "linear-gradient(90deg, #FF3D3D 0%, #930000 100%)",
                    fontSize: "16px",
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