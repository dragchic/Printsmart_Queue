"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TvState = {
  now: number | null;
  next: number | null;
};

type QueueItem = {
  queue_number: number;
  status: string;
};

function formatQueue(num: number | null) {
  if (!num) return "A-000";
  return `A-${String(num).padStart(3, "0")}`;
}

export default function TvPage() {
  const [state, setState] = useState<TvState>({ now: null, next: null });
  const [time, setTime] = useState(new Date());
  const [selesaiList, setSelesaiList] = useState<string[]>([]);
  const [menungguList, setMenungguList] = useState<string[]>([]);

  const [ads, setAds] = useState<string[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [displayedAd, setDisplayedAd] = useState<string | null>(null);

  function isVideoFile(file?: string | null) {
    return !!file && file.toLowerCase().endsWith(".mp4");
  }

  function getNextIndex(current: number, length: number) {
    return (current + 1) % length;
  }

  async function preloadMedia(file: string): Promise<void> {
    const src = `/api/ads/file?name=${encodeURIComponent(file)}`;

    if (isVideoFile(file)) {
      await new Promise<void>((resolve, reject) => {
        const video = document.createElement("video");
        video.src = src;
        video.preload = "auto";
        video.muted = true;
        video.oncanplaythrough = () => resolve();
        video.onerror = () => reject();
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.src = src;
        img.onload = () => resolve();
        img.onerror = () => reject();
      });
    }
  }

  async function goToNextAd() {
    if (ads.length <= 1) return;

    const nextIndex = getNextIndex(currentAdIndex, ads.length);
    const nextFile = ads[nextIndex];

    try {
      await preloadMedia(nextFile);
      setCurrentAdIndex(nextIndex);
      setDisplayedAd(nextFile);
    } catch {}
  }

  // AUDIO ANTRIAN
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  function getQueueAudioSequence(queueNumber: number) {
    const digits = String(queueNumber).padStart(3, "0").split("");
  
    return [
      "/queue-audio/call-bell.mp3", 
      "/queue-audio/nomor-antrian.mp3",
      ...digits.map((digit) => `/queue-audio/${digit}.mp3`),
    ];
  }

  async function playAudioWithOverlap(files: string[]) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
  
      const audio = new Audio(file);
      audio.preload = "auto";
  
      // tunggu metadata supaya dapat duration
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => resolve();
      });
  
      audio.play().catch((err) => {
        console.error("Audio play error:", err);
      });
  
      // kalau ini bukan audio terakhir
      if (i < files.length - 1) {
        const isBell = file.includes("bell");
  
        if (isBell && audio.duration) {
          // overlap: start next audio 0.2 detik sebelum selesai
          const overlapTime = (audio.duration - 0.2) * 1000;
  
          await sleep(overlapTime > 0 ? overlapTime : 0);
        } else {
          // normal delay antar audio
          await sleep(audio.duration * 1000 || 300);
        }
      } else {
        // tunggu audio terakhir selesai
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
        });
      }
    }
  }
  
  async function playAudioSequence(files: string[]) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
  
      await new Promise<void>((resolve) => {
        const audio = new Audio(file);
        audio.preload = "auto";
  
        audio.onended = () => resolve();
        audio.onerror = () => {
          console.error("Audio error:", file);
          resolve();
        };
  
        audio.play().catch((err) => {
          console.error("Audio play blocked/error:", err);
          resolve();
        });
      });
  
      // delay antar bagian suara
      if (file.includes("bell")) {
        await sleep(400);
      } else if (file.includes("nomor-antrian")) {
        await sleep(300);
      } else {
        await sleep(300);
      }
    }
  }
  
  async function announceQueue(queueNumber: number) {
    const files = [
      "/queue-audio/call-bell.mp3",
      "/queue-audio/nomor-antrian.mp3",
      ...String(queueNumber)
        .padStart(3, "0")
        .split("")
        .map((d) => `/queue-audio/${d}.mp3`),
    ];
  
    await playAudioWithOverlap(files);
  }

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadQueueBoard() {
      try {
        const res = await fetch("/api/tv/queue_board", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) return;

        setSelesaiList(
          data.selesai?.map((item: QueueItem) =>
            formatQueue(item.queue_number)
          ) ?? []
        );

        setMenungguList(
          data.menunggu?.map((item: QueueItem) =>
            formatQueue(item.queue_number)
          ) ?? []
        );
      } catch {}
    }

    loadQueueBoard();

    const interval = setInterval(loadQueueBoard, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadAds() {
      try {
        const res = await fetch("/api/ads/list", { cache: "no-store" });
        const data = await res.json();

        if (res.ok) {
          const files = data.files ?? [];
          setAds(files);

          if (files.length > 0) {
            setCurrentAdIndex(0);
            setDisplayedAd(files[0]);
          }
        }
      } catch {}
    }

    loadAds();
  }, []);

  useEffect(() => {
    if (!displayedAd) return;
    if (isVideoFile(displayedAd)) return;

    const timer = setTimeout(() => {
      goToNextAd();
    }, 10000);

    return () => clearTimeout(timer);
  }, [displayedAd, currentAdIndex, ads]);

  useEffect(() => {
    async function loadInitialState() {
      try {
        const res = await fetch("/api/tv/state", {
          cache: "no-store",
        });

        const data = await res.json();

        if (res.ok) {
          setState({
            now: data.now ?? null,
            next: data.next ?? null,
          });
        }
      } catch {}
    }

    loadInitialState();

    const es = new EventSource("/api/tv/stream");

    es.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
    
        if (msg.type === "call") {
          const newNow = msg.now ?? null;
    
          setState({
            now: newNow,
            next: msg.next ?? null,
          });
    
          if (newNow !== null) {
            announceQueue(newNow);
          }
        }
    
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    return () => es.close();
  }, []);

  return (
    <main
      className="w-screen h-screen overflow-hidden text-black"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.15), rgba(255,146,146,0.15)), url('/pg-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full h-full px-[2vw] py-[2vh] flex flex-col">
        {/* HEADER */}
        <div className="flex justify-between items-start">
          <Image
            src="/printsmart-logo.png"
            alt="PrintSmart"
            width={260}
            height={80}
            priority
            className="w-[14vw] min-w-[180px] max-w-[280px] h-auto"
          />

          <div className="text-right font-bold text-red-600 leading-tight">
            <div className="text-[clamp(20px,1.8vw,34px)]">
              {new Intl.DateTimeFormat("id-ID", {
                timeZone: "Asia/Jakarta",
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(time)}
            </div>
            <div className="text-[clamp(20px,1.8vw,34px)]">
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              }).format(time)}{" "}
              WIB
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 mt-[2vh] flex gap-[1vw]">
          {/* LEFT ADS */}
          <section className="w-[42%] h-full flex justify-center">
            <div
              className="
                w-full
                max-w-[750px]
                h-full
                max-h-[550px]
                bg-white/80
                rounded-[18px]
                shadow-lg
                p-[1.2vw]
                flex flex-col
                overflow-hidden
              "
            >
              {/* MEDIA ADS - FIXED SIZE */}
              <div className="h-[clamp(240px,52vh,320px)] w-full shrink-0 rounded-[18px] overflow-hidden bg-black flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {displayedAd ? (
                    isVideoFile(displayedAd) ? (
                      <motion.video
                        key={displayedAd}
                        src={`/api/ads/file?name=${encodeURIComponent(displayedAd)}`}
                        autoPlay
                        muted
                        playsInline
                        onEnded={goToNextAd}
                        className="w-full h-full object-contain"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    ) : (
                      <motion.img
                        key={displayedAd}
                        src={`/api/ads/file?name=${encodeURIComponent(displayedAd)}`}
                        className="w-full h-full object-contain"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )
                  ) : (
                    <div className="text-white text-xl">Belum ada iklan</div>
                  )}
                </AnimatePresence>
              </div>

              {/* QR AREA */}
                <div className="mt-[1vh] h-[140px] shrink-0 grid grid-cols-2 gap-[0.8vw]">
                  
                  {/* REVIEW */}
                  <div className="flex flex-col items-center justify-between bg-white rounded-[12px] px-[0.4vw] py-[0.4vh]">
                    <span className="text-center text-[clamp(9px,0.7vw,14px)] leading-tight">
                      Review printSmart
                    </span>

                    <div className="flex-1 flex items-center justify-center w-full">
                      <img
                        src="/ExampleCode.png"
                        className="h-full max-h-[110px] w-auto object-contain"
                        alt="Review QR"
                      />
                    </div>
                  </div>

                  {/* COMPLAIN */}
                  <div className="flex flex-col items-center justify-between bg-white rounded-[12px] px-[0.4vw] py-[0.4vh]">
                    <span className="text-center text-[clamp(9px,0.7vw,14px)] leading-tight">
                      Complain printSmart
                    </span>

                    <div className="flex-1 flex items-center justify-center w-full">
                      <img
                        src="/ExampleCode.png"
                        className="h-full max-h-[110px] w-auto object-contain"
                        alt="Complain QR"
                      />
                    </div>
                  </div>

                </div>
            </div>
          </section>

          {/* RIGHT */}
          <section className="w-[58%] h-full">
            <div className="h-full rounded-lg bg-white/20 backdrop-blur-sm p-[1vw] flex flex-col gap-[1.8vh]">
              {/* NOW CALLING */}
              <div className="rounded-lg bg-gradient-to-r from-red-500 to-red-900 text-white p-[1.2vw] flex gap-[1vw] items-start">
                <ClipboardList
                  size={42}
                  className="mt-[0.5vh] min-w-[42px]"
                />

                <div>
                <div className="font-bold leading-none tracking-tight text-[clamp(80px,8vw,170px)]">
                  {formatQueue(state.now)}
                </div>

                  <div className="text-[clamp(18px,1.7vw,30px)] mt-[0.5vh]">
                    Please go to counter
                  </div>
                </div>
              </div>

              {/* BOARD */}
              <div className="flex-1 mt-[1vh] rounded-lg bg-[#f8f8f8] p-[1vw] grid grid-cols-2 gap-[1vw] overflow-hidden">
                {/* Order Bisa Diambil */}
                <div className="border-r border-gray-300 pr-[1vw] flex flex-col min-h-0 overflow-hidden">
                  <div className="text-center font-bold text-[clamp(18px,1.4vw,28px)] mb-[1vh] shrink-0">
                    Order Bisa Diambil
                  </div>

                  <div className="grid grid-cols-1 gap-[0.8vw] overflow-hidden">
                    {selesaiList.slice(0, 6).map((item) => (
                      <div
                        key={item}
                        className="rounded-[12px] border bg-[#f1ecec] flex items-center justify-center h-[7vh] min-h-[64px] text-[clamp(28px,2.5vw,46px)] font-semibold"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Menunggu */}
                <div className="pl-[1vw] flex flex-col min-h-0 overflow-hidden">
                  <div className="text-center font-bold text-[clamp(18px,1.4vw,28px)] mb-[1vh] shrink-0">
                    Menunggu
                  </div>

                  <div className="grid grid-cols-1 gap-[0.8vw] overflow-hidden">
                    {menungguList.slice(0, 6).map((item) => (
                      <div
                        key={item}
                        className="rounded-[12px] border bg-[#f1ecec] flex items-center justify-center h-[7vh] min-h-[64px] text-[clamp(28px,2.5vw,46px)] font-semibold"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}