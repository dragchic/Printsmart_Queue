"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(data.error ?? "Login failed");
        setLoading(false);
        return;
      }

      if (data.user.role === "OWNER") {
        router.push("/owner/dashboard");
      } else if (data.user.role === "COUNTER_SERVICE") {
        router.push("/counter");
      } else if (data.user.role === "MACHINE") {
        router.push("/worker/machine");
      } else if (data.user.role === "CASHIER") {
        router.push("/cashier");
      } else {
        router.push("/");
      }
    } catch {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen w-full overflow-x-hidden text-black"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.4), rgba(255,255,255,0.4)), url('/pg-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="min-h-screen px-16 py-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <Image
              src="/printsmart-logo.png"
              alt="printSmart"
              width={250}
              height={70}
              priority
              className="h-auto w-[290px]"
            />
            {/* <div
              className="mt-3"
              style={{
                width: "320px",
                height: "1px",
                backgroundColor: "#E8B7B8",
              }}
            /> */}
          </div>

          <div className="pt-2 text-right text-lg leading-tight">
            <div
              style={{
                color: "#ED2021",
                
                fontWeight: 700,
              }}
            >
              Your Every Printing Solution
            </div>
            <div
              className="mt-2"
              style={{
                color: "#ED2021",
                // fontSize: "22px",
                fontWeight: 700,
              }}
            >
              Since 2019
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center pt-8">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 p-8"
            style={{background: "linear-gradient(to bottom, rgba(253,253,253,1) 0%, rgba(252,252,252,1) 100%)", borderBlockColor: "#CCCCCC" }}>
            <h1 className="flex items-center justify-center text-2xl font-bold"
            style={{color: "#ED2021", marginBottom: "80px", marginTop: "10px"}}>Worker Login</h1>

            <div className="">
            <div className="flex flex-col gap-4">

              {/* Username */}
              <div
                className="flex items-center rounded-2xl border px-6"
                style={{
                  height: "50px",
                  borderColor: "#D1D1D1",
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              >
                <User size={22} strokeWidth={2.2} color="#A7A7A7" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="ml-4 w-full bg-transparent text-[20px] font-medium text-black placeholder:text-[#A7A7A7] outline-none"
                  style={{marginLeft: "10px"}}
                />
              </div>

              {/* Password */}
              <div
                className="flex items-center rounded-2xl border px-6"
                style={{
                  height: "50px",
                  borderColor: "#D1D1D1",
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              >
                <Lock size={22} strokeWidth={2.2} color="#A7A7A7" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="ml-4 w-full bg-transparent text-[20px] font-medium text-black placeholder:text-[#A7A7A7] outline-none"
                  style={{marginLeft: "10px"}}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) handleLogin();
                  }}
                />
              </div>

              {/* Link */}
              <Link
                href="/kiosk"
                className="text-[16px] font-medium underline"
                style={{ color: "#2F52FF" }}
              >
                Masuk Untuk Pelanggan
              </Link>

              {/* Button */}
              <div className="flex justify-center pt-8"
              style={{marginTop: "60px"}}>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="rounded-2xl bg-gradient-to-r from-[#FF3D3D] to-[#930000] px-4 py-3 text-white font-semibold disabled:bg-gray-400"
                  style={{ width: "300px" }}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>

              </div>
              
            </div>

            {message && (
              <div className="mt-4 text-sm text-red-600">{message}</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}