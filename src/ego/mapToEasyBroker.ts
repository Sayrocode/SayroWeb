import { EgoProperty, EasyBrokerDraft, EasyBrokerOperation } from "./types";
import { buildLocationText, cleanText, normalizeCurrency, normalizeType, pickFirst, toNumber } from "./normalize";

export function mapEgoToEasyBroker(p: EgoProperty): EasyBrokerDraft {
  const property_type = normalizeType(p.propertyType || p["type"]);
  const bedrooms = toNumber(p.bedrooms);
  const bathrooms = toNumber(p.bathrooms);
  const parking_spaces = toNumber(p.parking);
  const lot_size = toNumber(p.lotSize);
  const construction_size = toNumber(p.constructionSize);
  const currency = normalizeCurrency(p.currency || (p as any).priceCurrency);

  const ops: EasyBrokerOperation[] = [];
  const sale = toNumber(p.salePrice || (p as any).priceSale || (p as any).price);
  const rent = toNumber(p.rentPrice || (p as any).priceRent || (p as any).rent);
  if (sale) ops.push({ type: "sale", amount: sale, currency });
  if (rent) ops.push({ type: "rental", amount: rent, currency });

  const title = cleanText(p.title || (p as any).name);
  const description = cleanText(p.description || (p as any).desc || (p as any).descriptionHtml);

  const locationText = buildLocationText({
    address: p.address,
    neighborhood: p.neighborhood,
    city: p.city,
    state: p.state,
    country: p.country,
  });

  const locationObj = {
    name: locationText,
    neighborhood: p.neighborhood || undefined,
    city: p.city || undefined,
    state: p.state || undefined,
    country: p.country || undefined,
    latitude: typeof p.latitude === "number" ? p.latitude : undefined,
    longitude: typeof p.longitude === "number" ? p.longitude : undefined,
  } as EasyBrokerDraft["location"];

  const images = Array.isArray(p.images)
    ? p.images.filter((u) => typeof u === "string" && u.trim()).map((url) => ({ url: String(url) }))
    : [];

  const external_id = pickFirst<string>(
    typeof p.externalId === "number" || typeof p.externalId === "string" ? String(p.externalId) : undefined,
    typeof p.id === "number" || typeof p.id === "string" ? String(p.id) : undefined
  );

  const draft: EasyBrokerDraft = {
    external_id,
    title,
    description,
    property_type,
    status: p.status || undefined,
    location: locationObj || locationText,
    bedrooms,
    bathrooms,
    parking_spaces,
    lot_size,
    construction_size,
    operations: ops,
    property_images: images,
  };

  // Remove undefined keys for cleanliness
  return JSON.parse(JSON.stringify(draft));
}

