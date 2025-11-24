import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, methodNotAllowed } from "./_utils";
import { defaultHomepageContent, normalizeHomepageContent } from "../../../lib/homepage-content";
import { saveHomepageContent } from "../../../lib/homepage-content.server";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const pageContent = (prisma as any).pageContent;
  if (!pageContent) {
    console.error("[admin/homepage] Prisma Client is missing the PageContent model. Regenerate the client (prisma generate) after updating prisma/schema.prisma.");
    return res.status(500).json({ error: "page_content_model_missing" });
  }

  if (req.method === "GET") {
    try {
      const row = await pageContent.findUnique({ where: { page: "home" } });
      const content = row?.dataJson
        ? normalizeHomepageContent(safeParse(row.dataJson))
        : defaultHomepageContent;
      return res.status(200).json({ content, updatedAt: row?.updatedAt || null });
    } catch (e) {
      console.error("[admin/homepage] fetch failed", e);
      return res.status(500).json({ error: "page_content_fetch_failed" });
    }
  }

  if (req.method === "PUT") {
    try {
      const payload = normalizeHomepageContent(req.body?.content || req.body);
      const saved = await saveHomepageContent(payload);
      return res.status(200).json(saved);
    } catch (e) {
      console.error("[admin/homepage] save failed", e);
      return res.status(500).json({ error: "page_content_save_failed" });
    }
  }

  return methodNotAllowed(res, ["GET", "PUT"]);
}

function safeParse(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
