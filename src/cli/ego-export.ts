/*
  CLI to convert Ego pages into EasyBroker-ready JSON.

  Usage examples:
    - From a directory of JSON pages (each page is an array of EgoProperty):
        ts-node src/cli/ego-export.ts --input-dir data/ego --out exports/easybroker

    - From HTTP (implement fetchEgoPage to your site):
        ts-node src/cli/ego-export.ts --fetch --base "https://ego.site/listado" --start 1 --end 5 --out exports/easybroker

  Writes one output file per page: out/page-001.json, etc.
*/

import fs from "fs";
import path from "path";
import { mapEgoToEasyBroker } from "../ego/mapToEasyBroker";
import type { EgoProperty, EasyBrokerDraft, EasyBrokerOperation } from "../ego/types";
import { writeXlsx } from "../ego/excel";

type Args = {
  inputDir?: string;
  fetch?: boolean;
  base?: string;
  start?: number;
  end?: number;
  out: string;
};

function parseArgs(argv: string[]): Args {
  const args: any = { out: "exports/easybroker" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = (k: string) => argv[++i];
    if (a === "--input-dir") args.inputDir = n("input-dir");
    else if (a === "--fetch") args.fetch = true;
    else if (a === "--base") args.base = n("base");
    else if (a === "--start") args.start = parseInt(n("start"), 10);
    else if (a === "--end") args.end = parseInt(n("end"), 10);
    else if (a === "--out") args.out = n("out");
  }
  return args as Args;
}

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function toExcelRow(d: EasyBrokerDraft) {
  // Extract sale/rent amounts and currencies (first found)
  const sale = (d.operations || []).find((o) => o.type === "sale") as EasyBrokerOperation | undefined;
  const rent = (d.operations || []).find((o) => o.type === "rental") as EasyBrokerOperation | undefined;
  const imgs = Array.isArray(d.property_images) ? d.property_images.map((i) => i.url).filter(Boolean) : [];

  const loc = typeof d.location === "string" ? { name: d.location } : (d.location || ({} as any));

  const row: Record<string, any> = {
    external_id: d.external_id || "",
    title: d.title || "",
    description: d.description || "",
    property_type: d.property_type || "",
    status: d.status || "",

    location_name: loc?.name || "",
    location_neighborhood: loc?.neighborhood || "",
    location_city: loc?.city || "",
    location_state: loc?.state || "",
    location_country: loc?.country || "",
    latitude: loc?.latitude ?? "",
    longitude: loc?.longitude ?? "",

    bedrooms: d.bedrooms ?? "",
    bathrooms: d.bathrooms ?? "",
    parking_spaces: d.parking_spaces ?? "",
    lot_size: d.lot_size ?? "",
    construction_size: d.construction_size ?? "",

    sale_price: sale?.amount ?? "",
    sale_currency: sale?.currency || "",
    rent_price: rent?.amount ?? "",
    rent_currency: rent?.currency || "",
  };

  // up to 10 images
  for (let i = 0; i < 10; i++) {
    row[`image_${i + 1}`] = imgs[i] || "";
  }
  return row;
}

async function fromInputDir(inputDir: string, outDir: string) {
  const files = (await fs.promises.readdir(inputDir))
    .filter((f) => /\.(json)$/i.test(f))
    .sort();

  if (!files.length) {
    console.error(`No se encontraron archivos .json en ${inputDir}`);
    process.exit(1);
  }

  await ensureDir(outDir);

  for (const [idx, file] of files.entries()) {
    const p = path.join(inputDir, file);
    const raw = await fs.promises.readFile(p, "utf8");
    let list: EgoProperty[] = [];
    try {
      const j = JSON.parse(raw);
      list = Array.isArray(j) ? j : Array.isArray(j?.content) ? j.content : [];
    } catch (e) {
      console.error(`Archivo inválido: ${p}`);
      continue;
    }

    const mapped = list.map((it) => mapEgoToEasyBroker(it));
    const rows = mapped.map((d) => toExcelRow(d));
    const outName = `page-${String(idx + 1).padStart(3, "0")}.xlsx`;
    const outPath = path.join(outDir, outName);
    await writeXlsx(rows, outPath, "EasyBroker");
    console.log(`→ ${outPath} (${rows.length} propiedades)`);
  }
}

async function fetchEgoPage(_base: string, _page: number): Promise<EgoProperty[]> {
  // Placeholder: implement HTTP GET to your Ego listing and parse response into EgoProperty[]
  // Example: GET `${base}?page=${page}` and extract JSON or scrape HTML with selectors
  throw new Error("fetchEgoPage no está implementado para HTTP");
}

async function fromHttp(base: string, start: number, end: number, outDir: string) {
  await ensureDir(outDir);
  for (let page = start; page <= end; page++) {
    const egoItems = await fetchEgoPage(base, page);
    const mapped = egoItems.map((it) => mapEgoToEasyBroker(it));
    const rows = mapped.map((d) => toExcelRow(d));
    const outName = `page-${String(page).padStart(3, "0")}.xlsx`;
    const outPath = path.join(outDir, outName);
    await writeXlsx(rows, outPath, "EasyBroker");
    console.log(`→ ${outPath} (${rows.length} propiedades)`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.out) {
    console.error("Falta --out <dir>");
    process.exit(1);
  }

  if (args.inputDir) {
    await fromInputDir(args.inputDir, args.out);
    return;
  }

  if (args.fetch) {
    if (!args.base || !args.start || !args.end) {
      console.error("Para --fetch requiere --base, --start y --end");
      process.exit(1);
    }
    await fromHttp(args.base, args.start, args.end, args.out);
    return;
  }

  console.error("Uso: --input-dir <dir> --out <dir> | --fetch --base <url> --start <n> --end <n> --out <dir>");
  process.exit(1);
}

// Run only when invoked directly
if (require.main === module) {
  main().catch((e) => {
    console.error(e?.message || e);
    process.exit(1);
  });
}
