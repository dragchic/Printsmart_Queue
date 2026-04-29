// "use client";

// import qz from "qz-tray";

// qz.security.setCertificatePromise(() => Promise.resolve(""));
// qz.security.setSignaturePromise(() => Promise.resolve(""));

// function formatTanggalIndonesia(date = new Date()) {
//   return date.toLocaleString("id-ID", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function escposInit() {
//   return "\x1B\x40";
// }

// function escposAlignCenter() {
//   return "\x1B\x61\x01";
// }

// function escposAlignLeft() {
//   return "\x1B\x61\x00";
// }

// function escposTextNormal() {
//   return "\x1D\x21\x00";
// }

// function escposTextDoubleSize() {
//   return "\x1D\x21\x11";
// }

// function escposCut() {
//   return "\x1D\x56\x41";
// }

// function buildQueueTicketRaw(queueNumber: number, customerName: string) {
//   const no = `A-${String(queueNumber).padStart(3, "0")}`;
//   const tanggal = formatTanggalIndonesia();

//   return [
//     escposInit(),

//     escposAlignCenter(),
//     escposTextNormal(),
//     "PRINTSMART\n",
//     "--------------------------\n",

//     escposTextDoubleSize(),
//     `${no}\n`,

//     escposTextNormal(),
//     "--------------------------\n",

//     escposAlignLeft(),
//     `Nama: ${customerName}\n`,
//     `${tanggal}\n`,
//     "\n",

//     escposAlignCenter(),
//     "Mohon menunggu antrean Anda\n",
//     "\n\n\n",

//     escposCut(),
//   ].join("");
// }

// export async function getAvailablePrinters(): Promise<string[]> {
//   if (!qz.websocket.isActive()) {
//     console.log("[QZ] Connecting websocket...");
//     await qz.websocket.connect();
//   }

//   const printers = await qz.printers.find();
//   const printerList = Array.isArray(printers) ? printers : [printers];

//   console.log("[QZ] Available printers:", printerList);

//   return printerList;
// }

// async function resolvePrinterName(): Promise<string> {
//   const printers = await getAvailablePrinters();

//   const preferredNames = [
//     "POS80 Printer",
//     "POS-80",
//     "POS58 Printer",
//     "POS-58",
//     "USB Thermal Printer",
//     "Thermal Printer",
//   ];

//   const matched = preferredNames.find((preferred) =>
//     printers.some((p) => p.toLowerCase() === preferred.toLowerCase())
//   );

//   if (matched) {
//     console.log("[QZ] Matched preferred printer:", matched);
//     return matched;
//   }

//   if (printers.length === 0) {
//     throw new Error("Tidak ada printer yang terdeteksi oleh QZ Tray");
//   }

//   console.warn(
//     '[QZ] Printer "POS80 Printer" tidak ditemukan, fallback ke printer pertama:',
//     printers[0]
//   );

//   return printers[0];
// }

// export async function printQueueTicket(
//   queueNumber: number,
//   customerName: string
// ): Promise<void> {
//   try {
//     if (!qz.websocket.isActive()) {
//       console.log("[QZ] Connecting websocket before print...");
//       await qz.websocket.connect();
//     }

//     const printerName = await resolvePrinterName();
//     console.log("[QZ] Using printer:", printerName);

//     const config = qz.configs.create(printerName);
//     const rawData = buildQueueTicketRaw(queueNumber, customerName);

//     console.log("[QZ] Printing ticket...", {
//       queueNumber,
//       customerName,
//     });

//     await qz.print(config, [
//       {
//         type: "raw",
//         format: "plain",
//         flavor: "plain",
//         data: rawData,
//       } as any,
//     ]);

//     console.log("[QZ] Print success");
//   } catch (err) {
//     console.error("[QZ] Print gagal:", err);
//     throw err;
//   }
// }

//LAINNNN LAGI

// export async function printQueueTicket(
//   queueNumber: number,
//   customerName: string
// ): Promise<void> {
//   if (!qz.websocket.isActive()) {
//     await qz.websocket.connect();
//   }
//   console.log("QZ Active:", qz.websocket.isActive());

//   const found = await qz.printers.find("POS80 Printer");
//   const printer = Array.isArray(found) ? found[0] : found;

//   if (!printer) {
//     throw new Error('Printer "POS80 Printer" tidak ditemukan');
//   }

//   const config = qz.configs.create(printer, {
//     copies: 1,
//   });
//   const no = `A-${String(queueNumber).padStart(3, "0")}`;

//   const rawData = [
//     "\x1B\x40",
//     "\x1B\x61\x01",
//     "PRINTSMART\n",
//     "--------------------------\n",
//     `Nomor: ${no}\n`,
//     `Nama: ${customerName}\n`,
//     "--------------------------\n",
//     "Silakan tunggu dipanggil\n",
//     "\n\n\n",
//     "\x1D\x56\x41",
//   ].join("");

//   await qz.print(config, [
//     {
//       type: "raw",
//       format: "command",
//       flavor: "plain",
//       data: rawData,
//     },
//   ]);
// }

// "use client";

// import qz from "qz-tray";

// qz.security.setCertificatePromise(() => {
//   return Promise.resolve(null as any);
// });

// qz.security.setSignaturePromise((toSign) => {
//   return Promise.resolve("");
// });

// export async function getAvailablePrinters(): Promise<string[]> {
//   if (!qz.websocket.isActive()) {
//     await qz.websocket.connect();
//   }

//   const printers = await qz.printers.find();
//   return Array.isArray(printers) ? printers : [printers];
// }



// export async function printQueueTicket() {
//   if (!qz.websocket.isActive()) {
//     await qz.websocket.connect();
//   }

//   console.log("CONNECTED");

//   const printers = await qz.printers.find();
//   console.log("PRINTERS:", printers);

//   const printer = Array.isArray(printers) ? printers[0] : printers;

//   const config = qz.configs.create(printer);

//   await qz.print(config, ["TEST PRINT\n\n\n"]);

//   console.log("DONE");
// }

"use client";

import qz from "qz-tray";

qz.security.setCertificatePromise(async () => {
  const res = await fetch("/qz/digital-certificate.txt", {
    cache: "no-store",
    headers: { "Content-Type": "text/plain" },
  });

  if (!res.ok) {
    throw new Error("Gagal mengambil QZ certificate");
  }

  return await res.text();
});

qz.security.setSignatureAlgorithm("SHA512");

qz.security.setSignaturePromise(async (toSign: string): Promise<string> => {
  const res = await fetch(
    `/api/qz/sign?request=${encodeURIComponent(toSign)}`,
    {
      cache: "no-store",
      headers: { "Content-Type": "text/plain" },
    }
  );

  if (!res.ok) {
    throw new Error("Gagal mengambil QZ signature");
  }

  return await res.text();
});

function formatTanggalIndonesia(date = new Date()) {
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escposInit() {
  return "\x1B\x40";
}

function escposAlignCenter() {
  return "\x1B\x61\x01";
}

function escposAlignLeft() {
  return "\x1B\x61\x00";
}

function escposTextNormal() {
  return "\x1D\x21\x00";
}

function escposTextDoubleSize() {
  return "\x1D\x21\x11";
}

function escposCut() {
  return "\x1D\x56\x41";
}

function buildQueueTicketRaw(queueNumber: number, customerName: string) {
  const no = `A-${String(queueNumber).padStart(3, "0")}`;
  const tanggal = formatTanggalIndonesia();

  return [
    escposInit(),
    escposAlignCenter(),
    escposTextNormal(),
    "PRINTSMART\n",
    "--------------------------\n",
    escposTextDoubleSize(),
    `${no}\n`,
    escposTextNormal(),
    "--------------------------\n",
    escposAlignCenter(),
    `Nama: ${customerName}\n`,
    `${tanggal}\n`,
    "\n",
    escposAlignCenter(),
    "Mohon menunggu antrean Anda\n",
    "\n\n\n",
    "\n\n\n",
    escposCut(),
  ].join("");
}

export async function getAvailablePrinters(): Promise<string[]> {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }

  const printersRaw = await qz.printers.find();
  const printers = Array.isArray(printersRaw) ? printersRaw : [printersRaw];
  console.log("[QZ] available printers:", printers);
  return printers;
}

function resolvePrinter(printers: string[]): string {
  const exact = printers.find(
    (p) => p.toLowerCase() === "pos80 printer".toLowerCase()
  );
  if (exact) return exact;

  const keywordMatch = printers.find((p) => {
    const name = p.toLowerCase();
    return (
      name.includes("pos80") ||
      name.includes("pos-80") ||
      name.includes("thermal") ||
      name.includes("receipt")
    );
  });

  if (keywordMatch) return keywordMatch;

  throw new Error(
    `Printer thermal tidak ditemukan. Printer tersedia: ${printers.join(", ")}`
  );
}

export async function printQueueTicket(
  queueNumber: number,
  customerName: string
): Promise<void> {
  try {
    console.log("[QZ] printQueueTicket() start");

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
    }

    const printers = await getAvailablePrinters();
    const selectedPrinter = resolvePrinter(printers);

    console.log("[QZ] selected printer:", selectedPrinter);

    const config = qz.configs.create(selectedPrinter);
    const rawData = buildQueueTicketRaw(queueNumber, customerName);

    await qz.print(config, [
      {
        type: "raw",
        format: "command",
        flavor: "plain",
        data: rawData,
      } as any,
    ]);

    console.log("[QZ] print success");
  } catch (err) {
    console.error("[QZ] print gagal:", err);
    throw err;
  }
}