import { prisma } from "./prisma";
import {
  HomepageContent,
  defaultHomepageContent,
  normalizeHomepageContent,
} from "./homepage-content";

export async function getHomepageContentFromDb() {
  const pageContent = (prisma as any).pageContent;
  if (!pageContent) {
    console.error("[homepage-content] Prisma client missing PageContent model. Run `prisma generate` to refresh the client.");
    return defaultHomepageContent;
  }
  try {
    const row = await pageContent.findUnique({ where: { page: "home" } });
    if (row?.dataJson) {
      try {
        const parsed = JSON.parse(row.dataJson);
        return normalizeHomepageContent(parsed);
      } catch (e) {
        console.error("[homepage-content] parse error", e);
      }
    }
  } catch (e) {
    console.error("[homepage-content] fetch error", e);
  }
  return defaultHomepageContent;
}

export async function saveHomepageContent(content: HomepageContent) {
  const pageContent = (prisma as any).pageContent;
  if (!pageContent) throw new Error("Prisma client missing PageContent model. Run `prisma generate` so it includes PageContent.");
  const normalized = normalizeHomepageContent(content);
  const stored = await pageContent.upsert({
    where: { page: "home" },
    update: { dataJson: JSON.stringify(normalized) },
    create: { page: "home", dataJson: JSON.stringify(normalized) },
    select: { dataJson: true, updatedAt: true },
  });
  const parsed = (() => {
    try {
      return JSON.parse(stored.dataJson);
    } catch {
      return normalized;
    }
  })();
  return { content: normalizeHomepageContent(parsed), updatedAt: stored.updatedAt };
}
