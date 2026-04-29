// components/owner/owner-sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Gauge,
  ClipboardList,
  Package,
  Users,
  LogOut,
  CircleUserRound,
  X,
} from "lucide-react";

type OwnerSidebarProps = {
  ownerName?: string;
  open?: boolean;
  onClose?: () => void;
};

const menuItems = [
  { label: "Dashboard", href: "/owner/dashboard", icon: Gauge },
  { label: "Data Pelanggan", href: "/owner/data-pelanggan", icon: ClipboardList },
  { label: "Gudang", href: "/owner/inventory", icon: Package },
  { label: "Human Resource", href: "/owner/human-resource", icon: Users },
];

export default function OwnerSidebar({
  ownerName = "Owner1",
  open = false,
  onClose,
}: OwnerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function isActive(href: string) {
    return pathname === href;
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* overlay mobile */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen w-[320px] flex-col
          border-r border-black/10 bg-white/70 px-8 py-8 backdrop-blur-sm
          transition-transform duration-300

          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* close mobile */}
        <div className="mb-4 flex justify-end lg:hidden text-black">
          <button onClick={onClose}>
            <X size={28} />
          </button>
        </div>

        {/* LOGO */}
        <div className="mb-10">
          <div className="text-[34px] font-extrabold italic text-[#E32626]">
            printSmart
          </div>

          <div className="mt-[-4px] text-[14px] font-medium text-black/60">
            Fast · Easy · Delivered
          </div>

          <div className="mt-5 h-px w-full bg-[#E8D9D5]" />
        </div>

        {/* PROFILE */}
        <div className="mb-12 flex items-center rounded-2xl border border-black/10 bg-white/90 px-6">
        <div className="py-4 flex flex-row">
            <div className="mr-5 items-center justify-center text-black">
            <CircleUserRound size={31} />
          </div>

          <div className="text-[20px] font-semibold text-[#E32626]">
            {ownerName}
          </div>
        </div>
          
        </div>

        {/* MENU */}
        <nav className="space-y-7">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex h-[72px] items-center gap-5 rounded-[24px] px-6 text-[18px] font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-[#FF3A3A] to-[#B30000] text-white shadow-md"
                    : "text-black hover:bg-white/80"
                }`}
              >
                <Icon size={30} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <div className="mt-auto pt-14">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-[78px] w-full items-center justify-center gap-3 rounded-[24px] bg-gradient-to-r from-[#FF3A3A] to-[#B30000] text-[20px] font-semibold text-white shadow-md"
          >
            <LogOut size={28} />
            <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}