// pages/api/easybroker/[...path].ts
import type { NextApiRequest, NextApiResponse } from "next";

const EB_BASE = "https://api.easybroker.com/v1";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta EASYBROKER_API_KEY en variables de entorno" });
  }

  const segments = ([] as string[]).concat((req.query.path as string[] | undefined) ?? []);
  const endpoint = segments.join("/"); // e.g. "properties/PROPERTY_ID"
  if (!endpoint) {
    return res.status(400).json({ error: "Falta endpoint en la URL" });
  }

  // allowlist simple (evita abusos)
  if (!/^properties(\/|$)/.test(endpoint)) {
    return res.status(400).json({ error: "Endpoint no permitido" });
  }

  // reconstruye querystring
  const qs = new URLSearchParams();
  Object.entries(req.query).forEach(([k, v]) => {
    if (k === "path") return;
    if (Array.isArray(v)) v.forEach((vv) => qs.append(k, String(vv)));
    else if (v != null) qs.append(k, String(v));
  });

  const url = `${EB_BASE}/${endpoint}${qs.toString() ? `?${qs}` : ""}`;

  try {
    const ebRes = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", "X-Authorization": apiKey },
    });

    const json = await ebRes.json().catch(async () => ({ raw: await ebRes.text() }));
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(ebRes.status).json(json);
  } catch (err: any) {
    console.error("EasyBroker proxy error:", err?.message || err);
    return res.status(502).json({ error: "Error al contactar EasyBroker" });
  }
}
