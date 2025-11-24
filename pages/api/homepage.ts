import type { NextApiRequest, NextApiResponse } from "next";
import { getHomepageContentFromDb } from "../../lib/homepage-content.server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const content = await getHomepageContentFromDb();
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
  return res.status(200).json({ content });
}
