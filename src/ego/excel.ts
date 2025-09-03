import fs from "fs";

// Writes rows (array of objects) to an XLSX file using the 'xlsx' package.
// We load xlsx via eval("require('xlsx')") to avoid compile-time dependency.
export async function writeXlsx(rows: any[], outPath: string, sheetName = "Sheet1") {
  // Lazy-load xlsx at runtime
  let XLSX: any;
  try {
    // eslint-disable-next-line no-eval
    XLSX = eval("require('xlsx')");
  } catch (e) {
    throw new Error("Falta dependencia 'xlsx'. Instala con: yarn add xlsx (o npm i xlsx)");
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  await fs.promises.writeFile(outPath, buf);
}

