// components/owner/owner-page-shell.tsx
"use client";

import { useState } from "react";
import OwnerSidebar from "@/components/owner/owner-sidebar";

type OwnerPageShellProps = {
  children: React.ReactNode;
  ownerName?: string;
};

export default function OwnerPageShell({
  children,
  ownerName = "Owner1",
}: OwnerPageShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen w-full">
      {/* BG */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(255,255,255,0.2),
              rgba(255,146,146,0.2)
            ),
            url('/pg-bg.png')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Sidebar */}
      <OwnerSidebar
        ownerName={ownerName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main */}
      <div className="min-h-screen lg:pl-[320px]">
        {/* tombol hamburger hanya layar kecil */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white/70 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl px-3 py-2 text-lg font-medium text-black"
          >
            ☰ Menu
          </button>

          <span className="font-semibold text-[#E32626] text-xl">printSmart</span>
        </div>

        <div className="p-4 lg:p-8">{children}</div>
      </div>
    </div>
  );
}