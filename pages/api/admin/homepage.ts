import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, methodNotAllowed } from "./_utils";
import { defaultHomepageContent, normalizeHomepageContent } from "../../../lib/homepage-content";
import { saveHomepageContent } from "../../../lib/homepage-content.server";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    const row = await prisma.pageContent.findUnique({ where: { page: "home" } });
    const content = row?.dataJson
      ? normalizeHomepageContent(safeParse(row.dataJson))
      : defaultHomepageContent;
    return res.status(200).json({ content, updatedAt: row?.updatedAt || null });
  }

  if (req.method === "PUT") {
    const payload = normalizeHomepageContent(req.body?.content || req.body);
    const saved = await saveHomepageContent(payload);
    return res.status(200).json(saved);
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
