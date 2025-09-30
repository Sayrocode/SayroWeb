// pages/api/easybroker.ts
import type { NextApiRequest, NextApiResponse } from "next";

const EB_BASE = "https://api.easybroker.com/v1/properties";

type EBPagination = {
  limit?: number;
  page?: number;
  total?: number;
  next_page?: number | null;
};

type EBListResponse<T = any> = {
  pagination?: EBPagination;
  content?: T[];
  [k: string]: any;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.EASYBROKER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta EASYBROKER_API_KEY en variables de entorno" });
  }

  try {
    const { all, page, limit, ...restQuery } = req.query;

    const params = new URLSearchParams();
    Object.entries(restQuery).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((vv) => params.append(k, String(vv)));
      else if (v != null) params.append(k, String(v));
    });

    const perPage = Math.max(1, Math.min(parseInt(String(limit || "50"), 10) || 50, 100));
    const wantsAll = String(all ?? "").toLowerCase() === "1" || String(all ?? "").toLowerCase() === "true";

    // 🔹 Caso normal: página única
    if (!wantsAll) {
      const pg = Math.max(1, parseInt(String(page || "1"), 10) || 1);
      const url = `${EB_BASE}?page=${pg}&limit=${perPage}${params.toString() ? `&${params}` : ""}`;

      const upstream = await fetch(url, {
        headers: { accept: "application/json", "X-Authorization": apiKey },
      });

      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(upstream.status).json({ error: text });
      }

      const data: EBListResponse = await upstream.json();
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return res.status(200).json(data);
    }

    // 🔹 Caso all=1: recorrer todas las páginas
    const aggregated: any[] = [];
    let currentPage = 1;
    let nextPage: number | null | undefined = currentPage;
    let lastPagination: EBPagination | undefined;
    let safetyCounter = 0;

    while (nextPage && safetyCounter < 200) {
      const url = `${EB_BASE}?page=${currentPage}&limit=${perPage}${params.toString() ? `&${params}` : ""}`;
      const upstream = await fetch(url, {
        headers: { accept: "application/json", "X-Authorization": apiKey },
      });

      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(upstream.status).json({ error: text, page: currentPage });
      }

      const data: EBListResponse = await upstream.json();
      const items = Array.isArray(data.content) ? data.content : [];
      aggregated.push(...items);

      lastPagination = data.pagination;
      if (data.pagination && typeof data.pagination.next_page !== "undefined") {
        nextPage = data.pagination.next_page ?? null;
        currentPage = nextPage || 0;
      } else {
        if (items.length < perPage) {
          nextPage = null;
        } else {
          currentPage += 1;
          nextPage = currentPage;
        }
      }

      safetyCounter++;
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({
      pagination: {
        ...lastPagination,
        total: aggregated.length,
        page: 1,
        next_page: null,
        limit: perPage,
      },
      content: aggregated,
      meta: { pages_fetched: safetyCounter },
    });
  } catch (error: any) {
    console.error("EasyBroker API Error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
