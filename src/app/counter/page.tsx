"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  RefreshCcw,
  Search,
  Clock3,
  Bell,
  FileText,
} from "lucide-react";
import WorkerPageHeader from "@/components/worker/worker-page-header";
import WorkerPageShell from "@/components/worker/worker-page-shell";

type TabKey = "ACTIVE" | "IN_SERVICE" | "COMPLETED";

type TicketItem = {
  ticket_id: number;
  queue_number: number;
  status: "WAITING" | "SERVING" | "DONE" | "SKIPPED" | "CANCEL";
  created_at: string;
  updated_at?: string;
  called_at?: string | null;
  finished_at?: string | null;
  skipped_at?: string | null;
  canceled_at?: string | null;
  custom_service_name?: string | null;
  service_option_id?: number | null;
  service_option?: {
    name: string;
  } | null;
  customer: {
    name: string;
    phone_number: string;
  };
  items: {
    queue_ticket_item_id: number;
    service_option_id: number | null;
    custom_service_name: string | null;
    order_qty: number;
    note: string | null;
    machine_status?: "PENDING" | "DONE";
    is_machine_done?: boolean;
    service_option?: {
      service_option_id: number;
      name: string;
    } | null;
  }[];
};

type CsNotification = {
  id: string;
  message: string;
  ticket_id?: number;
  customer_name: string;
  queue_number?: number;
  service_option?: string;
  created_at: number;
  is_read: boolean;
};

function getStatusColor(status: string) {
  switch (status) {
    case "SERVING":
      return "#F36B39";
    case "DONE":
      return "#4DC153";
    case "CANCEL":
      return "#ED2021";
    default:
      return "#446B9E";
  }
}

function getTabQuery(tab: TabKey) {
  if (tab === "ACTIVE") return "active";
  if (tab === "IN_SERVICE") return "in_serving";
  return "completed";
}

function queueLabel(queueNumber: number) {
  return `A-${String(queueNumber).padStart(3, "0")}`;
}

function formatStatusLabel(status: TicketItem["status"]) {
  if (status === "WAITING") return "In Waiting";
  if (status === "SERVING") return "In Service";
  if (status === "DONE") return "Completed";
  if (status === "CANCEL") return "Canceled";
  return "Skipped";
}

function formatItemName(item: TicketItem["items"][number]) {
  return item.service_option?.name ?? item.custom_service_name ?? "Tipe Order";
}

function formatItemNote(item: TicketItem["items"][number]) {
  if (item.note && item.note.trim()) return item.note;
  return `${item.order_qty} Lembar`;
}

function minutesSince(iso?: string | null) {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (!t) return "-";
  const diff = Date.now() - t;
  const mins = Math.max(0, Math.floor(diff / 60000));
  return `${mins} Minutes`;
}

function notifTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatClockOnly(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCompletedLabel(ticket: TicketItem) {
  if (ticket.status === "DONE" && ticket.finished_at) {
    return `Completed at ${formatClockOnly(ticket.finished_at)}`;
  }

  if (ticket.status === "SKIPPED" && ticket.skipped_at) {
    return `Skipped at ${formatClockOnly(ticket.skipped_at)}`;
  }

  if (ticket.status === "CANCEL" && (ticket.canceled_at || ticket.updated_at)) {
    return `Canceled at ${formatClockOnly(ticket.canceled_at ?? ticket.updated_at)}`;
  }

  return "-";
}

function isMachineItemDone(item: TicketItem["items"][number]) {
  if (typeof item.is_machine_done === "boolean") return item.is_machine_done;
  return item.machine_status === "DONE";
}

function getMachineDotColor(item: TicketItem["items"][number]) {
  return isMachineItemDone(item) ? "#11D911" : "#ED0000";
}

export default function CounterPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("ACTIVE");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [callingId, setCallingId] = useState<number | null>(null);

  const [notifications, setNotifications] = useState<CsNotification[]>([]);
  const [user, setUser] = useState<any>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/login");
    router.refresh();
  }

  async function fetchTickets(tab: TabKey) {
    setLoadingTickets(true);
    setMessage("");

    try {
      const query = getTabQuery(tab);
      const res = await fetch(`/api/tickets/tab-list?tab=${query}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTickets([]);
        setMessage(data.error ?? "Failed to load tickets");
        return;
      }

      setTickets(data.items ?? []);
    } catch {
      setTickets([]);
      setMessage("Unexpected error while loading tickets");
    } finally {
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    fetchTickets(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const es = new EventSource("/api/tickets/stream");

    es.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        if (msg.type === "waiting_changed" || msg.type === "machine_task_changed") {
          fetchTickets(activeTab);
        }

        if (msg.type === "cs_notification") {
          if (!user) return;
          if (msg.handled_by !== user?.username) return;

          setNotifications((prev) => [
            {
              id: `${msg.ticket_id}-${Date.now()}`,
              message: msg.message,
              ticket_id: msg.ticket_id,
              customer_name: msg.customer_name,
              queue_number: msg.queue_number,
              service_option: msg.service_option,
              created_at: Date.now(),
              is_read: false,
            },
            ...prev,
          ]);
        }
      } catch (err) {
        console.error("Counter SSE parse error:", err);
      }
    };

    es.onerror = (err) => {
      console.error("Counter SSE error:", err);
    };

    return () => es.close();
  }, [activeTab, user]);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
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

  function handleCall(ticket: TicketItem) {
    setMessage("");
    setSelectedTicket(ticket);
    setConfirmOpen(true);
  }

  async function handleConfirmProcess() {
    if (!selectedTicket) return;
  
    setLoadingSubmit(true);
    setCallingId(selectedTicket.ticket_id);
    setMessage("");
  
    try {
      // 1. CALL (trigger TV + suara)
      const callRes = await fetch("/api/tickets/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticket_id: selectedTicket.ticket_id }),
      });
  
      const callData = await callRes.json().catch(() => ({}));
  
      if (!callRes.ok) {
        setMessage(callData.error ?? "Failed to call ticket");
        return;
      }
  
      // 2. LANGSUNG DONE
      const doneRes = await fetch("/api/tickets/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: selectedTicket.ticket_id,
          status: "DONE",
        }),
      });
  
      const doneData = await doneRes.json().catch(() => ({}));
  
      if (!doneRes.ok) {
        setMessage(doneData.error ?? "Failed to complete ticket");
        return;
      }
  
      setConfirmOpen(false);
      setSelectedTicket(null);
      setActiveTab("COMPLETED");
      fetchTickets("COMPLETED");
  
      // refresh list
      fetchTickets(activeTab);
    } catch (err) {
      console.error(err);
      setMessage("Unexpected error");
    } finally {
      setLoadingSubmit(false);
      setCallingId(null);
    }
  }

  // async function handleSkip() {
  //   if (!selectedTicket) return;

  //   setLoadingSubmit(true);
  //   setMessage("");

  //   try {
  //     const res = await fetch("/api/tickets/update-status", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         ticket_id: selectedTicket.ticket_id,
  //         status: "SKIPPED",
  //       }),
  //     });

  //     const data = await res.json().catch(() => ({}));

  //     if (!res.ok) {
  //       setMessage(data.error ?? "Failed to skip ticket");
  //       return;
  //     }

  //     setConfirmOpen(false);
  //     setSelectedTicket(null);
  //     await fetchTickets(activeTab);
  //   } catch {
  //     setMessage("Unexpected error");
  //   } finally {
  //     setLoadingSubmit(false);
  //   }
  // }

  async function handleDone(ticket: TicketItem) {
    try {
      const res = await fetch("/api/tickets/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: ticket.ticket_id,
          status: "DONE",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update status");
      }

      fetchTickets(activeTab);
    } catch (err) {
      console.error(err);
      setMessage("Failed to update status");
    }
  }

  async function handleCancel(ticket: TicketItem) {
    try {
      const res = await fetch("/api/tickets/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: ticket.ticket_id,
          status: "CANCEL",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to cancel ticket");
      }

      fetchTickets(activeTab);
    } catch (err) {
      console.error(err);
      setMessage("Failed to cancel ticket");
    }
  }

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;

    return tickets.filter((ticket) => {
      const itemsText = (ticket.items ?? [])
        .map((item) => {
          const itemName = item.service_option?.name ?? item.custom_service_name ?? "";
          const itemNote = item.note ?? "";
          return `${itemName} ${itemNote} ${item.order_qty}`;
        })
        .join(" ");

      const haystack = [
        ticket.customer.name,
        ticket.customer.phone_number,
        queueLabel(ticket.queue_number),
        ticket.status,
        itemsText,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [tickets, search]);

  const firstWaitingTicketId = useMemo(() => {
    if (activeTab !== "ACTIVE") return null;

    const waitingTickets = [...filteredTickets]
      .filter((ticket) => ticket.status === "WAITING")
      .sort((a, b) => a.queue_number - b.queue_number);

    return waitingTickets[0]?.ticket_id ?? null;
  }, [filteredTickets, activeTab]);

  return (
    <WorkerPageShell>
      <main className="flex min-h-screen w-full flex-col overflow-x-hidden text-black">
        <div className="flex flex-1 flex-col px-16 pb-10 pt-6">
        <WorkerPageHeader
          role="Counter Worker"
          name={user?.full_name || user?.username || ""}
        />

        <div className="flex flex-1 flex-col">
          <section className="w-full">
            <div className="mb-8 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab("ACTIVE")}
                  className={`flex shrink-0 items-center justify-center rounded-2xl border text-xl font-medium transition ${
                    activeTab === "ACTIVE"
                      ? "border-transparent bg-gradient-to-r from-[#FF3D3D] to-[#930000] text-white shadow-sm"
                      : "border border-[#CCCCCC] bg-[#FAF5FB]/80 text-black hover:bg-[#FFF1F1] hover:shadow-sm"
                  }`}
                  style={{
                    width: "170px",
                    height: "46px",
                  }}
                >
                  Antrean Order
                </button>

                <button
                  onClick={() => setActiveTab("COMPLETED")}
                  className={`flex shrink-0 items-center justify-center rounded-2xl border text-xl transition ${
                    activeTab === "COMPLETED"
                      ? "border-transparent bg-gradient-to-r from-[#FF3D3D] to-[#930000] text-white shadow-sm"
                      : "border border-[#CCCCCC] bg-[#FAF5FB]/80 text-black hover:bg-[#FFF1F1] hover:shadow-sm"
                  }`}
                  style={{
                    width: "170px",
                    height: "46px",
                    fontWeight: 500,
                  }}
                >
                  Selesai
                </button>
              </div>

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

              <div
                className="rounded-2xl border bg-[#FAF5FB]/10 text-[18px] font-semibold backdrop-blur-md transition hover:bg-white/15"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderColor: "#d1d1d1",
                }}
              >
                <div className="mb-4 flex items-center justify-between gap-4 px-6 pt-6">
                  <h2 className="text-xl font-semibold">List Order Pelanggan</h2>

                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="flex items-center gap-3 rounded-2xl border bg-white/80 px-5"
                      style={{
                        height: "46px",
                        width: "220px",
                        borderColor: "#CCCCCC",
                        backgroundColor: "#FBF6FC",
                      }}
                    >
                      <Search size={26} strokeWidth={2.5} color="#7F7F7F" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari Order..."
                        className="w-full bg-transparent text-[18px] font-medium outline-none placeholder:text-[#7F7F7F]"
                      />
                    </div>

                    <button
                      onClick={() => fetchTickets(activeTab)}
                      className="flex items-center justify-center rounded-2xl border backdrop-blur-md transition hover:bg-white/20"
                      style={{
                        height: "46px",
                        width: "52px",
                        borderColor: "#CCCCCC",
                        backgroundColor: "rgba(250, 245, 251, 0.80)",
                      }}
                    >
                      <RefreshCcw size={23} strokeWidth={2.5} color="#7F7F7F" />
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4">
                  {loadingTickets ? (
                    <div className="rounded-2xl bg-white/90 p-6 text-gray-500">
                      Loading tickets...
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="rounded-2xl bg-white/90 p-6 text-gray-500">
                      No orders found.
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const isActiveCallButton =
                        activeTab === "ACTIVE" && ticket.ticket_id === firstWaitingTicketId;

                      const isCallingThis = callingId === ticket.ticket_id;

                      return (
                        <div
                          key={ticket.ticket_id}
                          className="mb-8 rounded-[24px] border px-10 py-9"
                          style={{
                            minHeight:
                              activeTab === "ACTIVE"
                                ? "124px"
                                : activeTab === "IN_SERVICE"
                                  ? ticket.items?.length && ticket.items.length > 1
                                    ? "250px"
                                    : "190px"
                                  : ticket.items?.length && ticket.items.length > 1
                                    ? "220px"
                                    : "170px",
                            borderColor: "#D7D7D7",
                            backgroundColor: "rgba(255,255,255,0.78)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          }}
                        >
                          <div className="flex h-full justify-between gap-6">
                            <div className="flex flex-1 flex-col justify-between">
                              {activeTab === "ACTIVE" ? (
                                <div className="flex h-full items-center justify-between gap-8">
                                  <div className="flex h-full flex-col justify-center">
                                    <div
                                      className="text-black"
                                      style={{
                                        fontSize: "28px",
                                        fontWeight: 500,
                                        lineHeight: 1.02,
                                      }}
                                    >
                                      {queueLabel(ticket.queue_number)}
                                    </div>

                                    <div
                                      className="mt-2 text-black"
                                      style={{
                                        fontSize: "28px",
                                        fontWeight: 500,
                                        lineHeight: 1.02,
                                      }}
                                    >
                                      {ticket.customer.name}
                                    </div>
                                  </div>

                                  <div className="flex h-full flex-col items-end justify-between gap-4 py-0">
                                    <div className="flex items-center gap-2 text-black">
                                      <Clock3 size={22} strokeWidth={2.1} />
                                      <span
                                        style={{
                                          fontSize: "18px",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {minutesSince(ticket.created_at)}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => handleCall(ticket)}
                                      disabled={!isActiveCallButton || isCallingThis}
                                      className="flex items-center justify-center gap-4 rounded-[10px] transition"
                                      style={{
                                        width: "160px",
                                        height: "50px",
                                        background:
                                          isActiveCallButton && !isCallingThis
                                            ? "linear-gradient(90deg, #FF4B4B 0%, #B40000 100%)"
                                            : "#CFCFCF",
                                        color: "#FFFFFF",
                                        fontSize: "22px",
                                        fontWeight: 700,
                                        cursor:
                                          isActiveCallButton && !isCallingThis
                                            ? "pointer"
                                            : "not-allowed",
                                        opacity: isCallingThis ? 0.9 : 1,
                                      }}
                                    >
                                      <Bell size={24} strokeWidth={2.4} />
                                      {isCallingThis ? "Calling..." : "Call"}
                                    </button>
                                  </div>
                                </div>
                              ) : activeTab === "IN_SERVICE" ? (
                                <div className="flex justify-between gap-8">
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between gap-8">
                                      <div>
                                        <div className="flex items-center gap-5">
                                          <div
                                            className="text-black"
                                            style={{
                                              fontSize: "32px",
                                              fontWeight: 500,
                                              lineHeight: 1,
                                            }}
                                          >
                                            {queueLabel(ticket.queue_number)}
                                          </div>

                                          <div
                                            className="text-black"
                                            style={{
                                              fontSize: "32px",
                                              fontWeight: 500,
                                              lineHeight: 1,
                                            }}
                                          >
                                            {ticket.customer.name}
                                          </div>
                                        </div>

                                        <div
                                          className="mt-3 text-black"
                                          style={{
                                            fontSize: "22px",
                                            fontWeight: 500,
                                            lineHeight: 1.1,
                                          }}
                                        >
                                          {ticket.customer.phone_number}
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => handleDone(ticket)}
                                        className="flex items-center justify-center rounded-[14px] transition hover:brightness-95"
                                        style={{
                                          width: "170px",
                                          height: "56px",
                                          background:
                                            "linear-gradient(90deg, #FF4B4B 0%, #B40000 100%)",
                                          color: "#FFFFFF",
                                          fontSize: "18px",
                                          fontWeight: 700,
                                          boxShadow: "0 4px 10px rgba(237, 32, 33, 0.22)",
                                        }}
                                      >
                                        ✓ Selesai
                                      </button>
                                    </div>

                                    <div className="mt-10 flex flex-col">
                                      {ticket.items?.length ? (
                                        ticket.items.map((item, index) => (
                                          <div key={item.queue_ticket_item_id}>
                                            <div className="flex items-center justify-between gap-8 py-4">
                                              <div
                                                className="min-w-[320px] text-black"
                                                style={{
                                                  fontSize: "22px",
                                                  fontWeight: 500,
                                                }}
                                              >
                                                {formatItemName(item)}
                                              </div>

                                              <div className="flex flex-1 items-center justify-start gap-3 text-[#7F7F7F]">
                                                <FileText size={20} strokeWidth={2.2} />
                                                <span
                                                  style={{
                                                    fontSize: "20px",
                                                    fontWeight: 500,
                                                  }}
                                                >
                                                  {formatItemNote(item)}
                                                </span>
                                              </div>

                                              <div className="flex w-[40px] justify-end">
                                                <div
                                                  className="h-[20px] w-[20px] rounded-full"
                                                  style={{
                                                    backgroundColor: getMachineDotColor(item),
                                                  }}
                                                />
                                              </div>
                                            </div>

                                            {index < ticket.items.length - 1 && (
                                              <div
                                                style={{
                                                  height: "1px",
                                                  width: "100%",
                                                  backgroundColor: "#6E6E6E",
                                                  opacity: 0.7,
                                                }}
                                              />
                                            )}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="py-2 text-gray-500">No item details.</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between gap-6">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start gap-10">
                                      <div className="min-w-[140px]">
                                        <div className="text-3xl font-medium">
                                          {queueLabel(ticket.queue_number)}
                                        </div>
                                        <div className="mt-3 text-2xl font-medium">
                                          {ticket.customer.name}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 pt-1 text-black">
                                        <Clock3 size={18} strokeWidth={2.0} />
                                        <span style={{ fontSize: "20px", fontWeight: 500 }}>
                                          {formatCompletedLabel(ticket)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-8 flex flex-col gap-4">
                                      {ticket.items?.length ? (
                                        ticket.items.map((item, index) => (
                                          <div key={item.queue_ticket_item_id}>
                                            <div className="flex items-end gap-16">
                                              <div className="min-w-[180px]">
                                                <div
                                                  className="text-black"
                                                  style={{ fontSize: "20px", fontWeight: 500 }}
                                                >
                                                  {formatItemName(item)}
                                                </div>
                                              </div>

                                              <div className="min-w-0 flex-1">
                                                <div
                                                  className="break-words text-[#7B7B7B]"
                                                  style={{ fontSize: "20px", fontWeight: 500 }}
                                                >
                                                  {formatItemNote(item)}
                                                </div>
                                              </div>
                                            </div>

                                            {index < ticket.items.length - 1 && (
                                              <div
                                                className="mt-4"
                                                style={{
                                                  height: "1px",
                                                  width: "360px",
                                                  backgroundColor: "#6E6E6E",
                                                }}
                                              />
                                            )}
                                          </div>
                                        ))
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="w-[190px] shrink-0">
                                    <div className="flex flex-col items-end gap-12">
                                      <span
                                        className="text-right"
                                        style={{
                                          color: getStatusColor(ticket.status),
                                          fontSize: "17px",
                                          fontWeight: 700,
                                          lineHeight: 1,
                                        }}
                                      >
                                        {ticket.status === "SKIPPED"
                                          ? "Skip"
                                          : formatStatusLabel(ticket.status)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {message && <div className="px-6 pb-6 text-sm text-red-600">{message}</div>}
              </div>
            </section>
          </div>
        </div>

        {confirmOpen && selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
            <div
              className="w-full max-w-[520px] rounded-[10px] border bg-white px-8 py-9 shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
              style={{ borderColor: "#D9D9D9" }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-5">
                  <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-[3px] border-black text-black">
                    <span className="text-[34px] font-bold leading-none">i</span>
                  </div>
                </div>

                <p
                  className="text-black"
                  style={{
                    fontSize: "24px",
                    fontWeight: 500,
                    lineHeight: 1.3,
                    maxWidth: "380px",
                  }}
                >
                  Anda telah memanggil
                  <br />
                  nomor antrean {queueLabel(selectedTicket.queue_number)}
                </p>

                <div className="mt-8 flex items-center gap-6">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    // disabled={loadingSubmit}
                    className="flex items-center justify-center rounded-[16px] text-white transition hover:brightness-95 disabled:opacity-70"
                    style={{
                      width: "140px",
                      height: "52px",
                      background: "linear-gradient(90deg, #FF4B4B 0%, #B40000 100%)",
                      fontSize: "18px",
                      fontWeight: 700,
                    }}
                  >
                    {loadingSubmit ? "Loading..." : "Batalkan"}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmProcess}
                    disabled={loadingSubmit}
                    className="rounded-[16px] text-white transition hover:brightness-105 disabled:bg-gray-400"
                    style={{
                      width: "140px",
                      height: "52px",
                      background: "linear-gradient(90deg, #FF3D3D 0%, #930000 100%)",
                      fontSize: "18px",
                      fontWeight: 700,
                    }}
                  >
                    {loadingSubmit ? "Loading..." : "Ya"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </WorkerPageShell>
  );
}