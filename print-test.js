const {
  ThermalPrinter,
  PrinterTypes,
} = require("node-thermal-printer");

async function testPrint() {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: "\\\\127.0.0.1\\POS80 Printer",
  });


  printer.alignCenter();
  printer.bold(true);
  printer.println("The Loveliest Couple");
  printer.println("--------------------");

  printer.bold(false);
  printer.setTextQuadArea();
  printer.println("realmetric <3 dragchic");

  printer.setTextQuadArea();
//   printer.println("A-001");

  printer.println("^3^");
  printer.setTextNormal();
  printer.println("from our 1st project");
  printer.println(new Date().toLocaleString());

  printer.cut();

  try {
    await printer.execute(); 
    console.log("✅ Print sukses");
  } catch (error) {
    console.error("❌ Print gagal:", error);
  }
}

testPrint();