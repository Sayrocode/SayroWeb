import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { requireAdmin, methodNotAllowed } from "../_utils";
import { prisma } from "../../../../lib/prisma";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  const { filename, mimeType, base64 } = req.body || {};
  if (!mimeType || !base64) return res.status(400).json({ error: "invalid_payload" });

  try {
    const b64 = String(base64).replace(/^data:[^;]+;base64,/, "");
    const buf = Buffer.from(b64, "base64");
    if (!buf.length) return res.status(400).json({ error: "empty_file" });

    const key = `homepage/${crypto.randomUUID()}`;
    const created = await prisma.mediaObject.create({
      data: {
        key,
        mimeType,
        size: buf.length,
        data: buf,
        filename: filename || null,
      },
      select: { key: true, mimeType: true, size: true },
    });
    const url = `/api/admin/images/${encodeURIComponent(created.key)}`;
    return res.status(201).json({ ...created, url });
  } catch (e: any) {
    console.error("[admin/homepage/upload] error", e);
    return res.status(500).json({ error: "upload_failed", detail: e?.message });
  }
}
