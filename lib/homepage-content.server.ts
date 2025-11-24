import { prisma } from "./prisma";
import {
  HomepageContent,
  defaultHomepageContent,
  normalizeHomepageContent,
} from "./homepage-content";

export async function getHomepageContentFromDb() {
  try {
    const row = await prisma.pageContent.findUnique({ where: { page: "home" } });
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
  const normalized = normalizeHomepageContent(content);
  const stored = await prisma.pageContent.upsert({
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
