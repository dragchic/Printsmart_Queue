"use client";

import Image from "next/image";
import { Smartphone, User, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import WorkerPageHeader from "@/components/worker/worker-page-header";
// import { printQueueTicket } from "@/lib/qz";

type StepMode = "PHONE_ONLY" | "REGISTER_NAME_PHONE";

type TicketResponse = {
  queue_number: number;
  ticket_id: number;
  customer?: {
    name: string;
    phone_number: string;
  };
};

export default function KioskPage() {
  const [mode, setMode] = useState<StepMode>("PHONE_ONLY");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<null | {
    queue_number: number;
    ticket_id: number;
    customer_name: string;
  }>(null);

  const phoneError = useMemo(() => {
    const p = phone.trim();
  
    if (p.length === 0) return "";
    if (!p.startsWith("08")) return "Nomor HP harus diawali 08";
    if (!/^\d+$/.test(p)) return "Nomor HP hanya boleh angka";
    if (p.length < 10 || p.length > 15) return "Nomor HP harus 10–15 digit";
    if (hasRepeatedPhonePattern(p)) return "Nomor HP tidak boleh berupa pola berulang";
    return "";
  }, [phone]);

  const nameError = useMemo(() => {
    if (mode !== "REGISTER_NAME_PHONE") return "";
    if (!name.trim()) return "Nama wajib diisi";
    return "";
  }, [name, mode]);

  const phoneTrimmed = phone.trim();
  const nameTrimmed = name.trim();

  const canCheckPhone =
    phoneTrimmed.length > 0 && phoneError === "" && !isCheckingPhone && !isSubmitting;

  const canSubmitNewCustomer =
    nameTrimmed.length > 0 &&
    phoneTrimmed.length > 0 &&
    phoneError === "" &&
    nameError === "" &&
    !isSubmitting;

  function resetForm() {
    setMode("PHONE_ONLY");
    setName("");
    setPhone("");
    setErrorMessage("");
    setCreatedTicket(null);
    setShowSuccess(false);
  }

  async function handleCheckPhone() {
    if (!canCheckPhone) return;

    setIsCheckingPhone(true);
    setErrorMessage("");

    try {
      const res = await fetch(
        `/api/kiosk/check-customer?phone=${encodeURIComponent(phoneTrimmed)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.error ?? "Gagal memeriksa nomor telepon");
        return;
      }

      if (data.exists && data.customer?.name) {
        await createTicket({
          name: data.customer.name,
          phone: phoneTrimmed,
        });
        return;
      }

      setMode("REGISTER_NAME_PHONE");
      setErrorMessage("Nomor Telepon Belum Terdaftar*");
    } catch (error) {
      console.error(error);
      setErrorMessage("Terjadi kesalahan saat memeriksa nomor telepon");
    } finally {
      setIsCheckingPhone(false);
    }
  }

  async function createTicket(payload: { name: string; phone: string }) {
    console.log("createTicket jalan");
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/kiosk/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: payload.name.trim(),
          phone: payload.phone.trim(),
        }),
      });

      const data: TicketResponse | { error?: string } = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        setErrorMessage((data as { error?: string }).error ?? "Gagal membuat nomor antrean");
        return;
      }

      const result = data as TicketResponse;

      setCreatedTicket({
        queue_number: result.queue_number,
        ticket_id: result.ticket_id,
        customer_name: result.customer?.name || payload.name,
      });

      try {
        console.log("Mulai print ticket...");
      
        const printRes = await fetch("/api/print/queue-ticket", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            queueNumber: `A-${String(result.queue_number).padStart(3, "0")}`,
            customerName: result.customer?.name || payload.name,
          }),
        });
      
        const printData = await printRes.json().catch(() => ({}));
      
        if (!printRes.ok) {
          throw new Error(printData.error ?? "Gagal mencetak tiket");
        }
      
        console.log("Print ticket berhasil");
      } catch (err) {
        console.error("Print ticket gagal:", err);
        alert("Nomor antrean berhasil dibuat, tetapi printer gagal mencetak.");
      }
      

      setShowSuccess(true);
      setTimeout(() => {
        resetForm();
      }, 5000);
    } catch (error) {
      console.error(error);
      setErrorMessage("Terjadi kesalahan saat membuat nomor antrean");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    console.log("BUTTON DIKLIK");
    if (mode === "PHONE_ONLY") {
      await handleCheckPhone();
      return;
    }

    if (!canSubmitNewCustomer) return;

    await createTicket({
      name: nameTrimmed,
      phone: phoneTrimmed,
    });
  }

  function hasRepeatedPhonePattern(phone: string) {
    const digits = phone.trim();
  
    if (!digits.startsWith("08")) return false;
  
    const body = digits.slice(2); // setelah 08
  
    if (body.length === 0) return false;
  
    // Contoh: 0811111111, 08222222, 0800000000
    if (/^(\d)\1+$/.test(body)) {
      return true;
    }
  
    // Contoh pola pendek berulang: 08080808, 08121212, 08383838
    for (let size = 1; size <= Math.floor(body.length / 2); size++) {
      const pattern = body.slice(0, size);
      if (pattern.repeat(Math.ceil(body.length / size)).slice(0, body.length) === body) {
        return true;
      }
    }
  
    return false;
  }

  return (
    <main
      className="min-h-screen w-full overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.62), rgba(255, 146, 146, 0.2)), url('/pg-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
        <div className="px-10 py-10 max-w-[1650px] mx-auto">        
          <WorkerPageHeader
          name=""
          role=""
        />

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">         
            <section className="col-span-12 lg:col-span-7 flex flex-col pl-2 gap-20">
            <div>
              <h1 className="text-[58px] font-bold leading-[1.14] text-black">
                Ambil Nomor Antrean
              </h1>
            </div>

            <div
              className="mt-12 rounded-[30px] border px-10 py-10"
              style={{
                width: "100%",
                maxWidth: "560px",
                minHeight: "370px",
                borderColor: "#DFD7D7",
                backgroundColor: "rgba(255,255,255,0.25)",
                backdropFilter: "blur(4px)",
              }}
            >
              <div className="flex flex-col gap-9">
                {[
                  { no: "1", text: "Isi data" },
                  { no: "2", text: "Dapat nomor antrean" },
                  { no: "3", text: "Tunggu dipanggil yaa" },
                ].map((step) => (
                  <div key={step.no} className="flex items-center gap-7">
                    <div
                      className="flex items-center justify-center rounded-full text-white"
                      style={{
                        width: "72px",
                        height: "72px",
                        backgroundColor: "#DD1F1B",
                        fontSize: "28px",
                        fontWeight: 700,
                      }}
                    >
                      {step.no}
                    </div>

                    <div className="text-[28px] font-medium text-black">
                      {step.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

              <section className="col-span-12 lg:col-span-5 flex justify-end">
              <div
              className="rounded-[30px] border px-12 py-12 ml-auto"
              style={{
                width: "100%",
                maxWidth: "800px",
                minHeight: "610px",
                borderColor: "#D5D0D0",
                backgroundColor: "rgba(255,255,255,0.78)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              }}
            >
              <div className="relative flex items-center justify-center mb-6">
                {/* BACK BUTTON */}
                {mode === "REGISTER_NAME_PHONE" && (
                  <button
                    onClick={() => {
                      setMode("PHONE_ONLY");
                      setName("");
                      setErrorMessage("");
                    }}
                    className="absolute left-0 flex items-center justify-center rounded-full p-2 hover:bg-black/5 transition"
                  >
                    <ArrowLeft size={26} className="text-black" />
                  </button>
                )}

                {/* TITLE */}
                <h2 className="text-[34px] font-bold text-[#ED2021] text-center">
                  Ambil Nomor Antrean
                </h2>
              </div>

              <p className="mt-4 max-w-[420px] mx-auto text-center text-[18px] font-medium leading-[1.5] text-[#A7A7A7]">                Isi data Anda di bawah untuk mendapatkan nomor antrean
              </p>

              <div className="mt-14 flex flex-col gap-8">
                {mode === "REGISTER_NAME_PHONE" && (
                  <div className="relative">
                    <User
                      size={28}
                      strokeWidth={2.2}
                      className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-[#B2B2B2]"
                    />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Lengkap"
                      className="h-[72px] w-full rounded-[22px] border bg-[#FAFAFA] pl-20 pr-6 text-[18px] font-medium text-black outline-none placeholder:text-[#B9B9B9]"
                      style={{
                        borderColor: "#D8D8D8",
                      }}
                    />
                  </div>
                )}

                <div className="relative">
                  <Smartphone
                    size={28}
                    strokeWidth={2.2}
                    className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-[#B2B2B2]"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxx"
                    inputMode="numeric"
                    className="h-[72px] w-full rounded-[22px] border bg-[#FAFAFA] pl-20 pr-6 text-[18px] font-medium text-black outline-none placeholder:text-[#B9B9B9]"
                    style={{
                      borderColor: "#D8D8D8",
                    }}
                  />
                </div>

                {mode === "PHONE_ONLY" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("REGISTER_NAME_PHONE");
                      setErrorMessage("");
                    }}
                    className="w-fit text-[16px] font-semibold text-[#4C58FF] underline underline-offset-4"
                  >
                    Pertama kali di printSmart
                  </button>
                )}

                <div className="min-h-[24px]">
                  <div className="text-[16px] font-semibold text-[#FF2A2A]">
                    {errorMessage ||
                      (!errorMessage && phoneError) ||
                      (!errorMessage && mode === "REGISTER_NAME_PHONE" && nameError) ||
                      ""}
                  </div>
                </div>
              </div>

              <div className={mode === "PHONE_ONLY" ? "mt-[250px]" : "mt-[170px]"}>
                <button
                  onClick={handleSubmit}
                  disabled={
                    mode === "PHONE_ONLY"
                      ? !canCheckPhone
                      : !canSubmitNewCustomer
                  }
                  className="h-[74px] w-full rounded-[24px] text-[20px] font-bold text-white transition"
                  style={{
                    background:
                      (mode === "PHONE_ONLY" ? canCheckPhone : canSubmitNewCustomer)
                        ? "linear-gradient(90deg, #FF3D3D 0%, #A30000 100%)"
                        : "#D6D6D6",
                    cursor:
                      (mode === "PHONE_ONLY" ? canCheckPhone : canSubmitNewCustomer)
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  {isCheckingPhone || isSubmitting
                    ? "Memproses..."
                    : "Ambil Nomor Antrean"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showSuccess && createdTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <div className="w-[620px] min-h-[640px] rounded-[24px] border border-black/10 bg-white px-12 py-14 text-center shadow-2xl">
            <h2 className="text-[34px] font-bold leading-[1.35] text-[#ED2021]">
              Selamat datang Bpk/Ibu {createdTicket.customer_name}
              <br />
              Nomor Antrean Anda
            </h2>

            <div className="mt-24 text-[96px] font-bold tracking-wide text-black">
              A-{String(createdTicket.queue_number).padStart(3, "0")}
            </div>

            <p className="mx-auto mt-24 max-w-[480px] text-[26px] font-semibold leading-[1.45] text-[#A7A7A7]">
              Silahkan Mengambil Struk Tiket Antrean Dan Menunggu Untuk Dibantu,
              Terima Kasih
            </p>

            <button
              type="button"
              onClick={resetForm}
              className="mt-10 rounded-[18px] bg-gradient-to-r from-[#FF3D3D] to-[#A30000] px-10 py-4 text-[18px] font-bold text-white shadow-sm transition hover:scale-[1.02]"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm;
            height: auto !important;
            overflow: hidden !important;
          }

          body * {
            visibility: hidden;
          }

          #print-ticket,
          #print-ticket * {
            visibility: visible;
          }

          #print-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 8px;
            margin: 0;
            display: block;
          }

          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
        `}</style>

    </main>
  );
}