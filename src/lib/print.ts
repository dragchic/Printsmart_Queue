import path from "path";
import Jimp from "jimp";

export async function printQueueTicket(
  queueNumber: string,
  customerName: string,
  orderId?: string | number
) {
  const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: "\\\\localhost\\POS80 Printer",
  });

  const logoPath = path.join(process.cwd(), "public", "printsmart-logo.png");

  try {
    console.log("PRINTING LOGO...");

    const image = await Jimp.read(logoPath);

    image
      .resize(250, Jimp.AUTO)
      .background(0xffffffff)
      .greyscale()
      .contrast(1);

    printer.alignCenter();
    await printer.printImageBuffer(await image.getBufferAsync(Jimp.MIME_PNG));
  } catch (err) {
    console.error("Logo error:", err);
  }

  printer.alignCenter();

  printer.println("----------------");

  // Nomor antrean besar
  printer.setTextQuadArea();
  printer.println(queueNumber);

  printer.println("----------------");

  printer.setTextNormal();
  printer.println(`Nama: ${customerName}`);

  // ID order dibuat lebih besar
  if (orderId !== undefined && orderId !== null) {
    printer.println("");
    printer.setTextDoubleHeight();
    printer.println(`ID ORDER: ${orderId}`);
    printer.setTextNormal();
  }

  printer.println(
    new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  printer.println("");
  printer.println("Mohon menunggu antrean Anda");

  printer.println("");
  printer.println("----------------");
  printer.println("Instagram: @printsmartbsd");
  printer.println("----------------");

  printer.cut();

  await printer.execute();
}