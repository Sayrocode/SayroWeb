// Minimal shapes for Ego source and EasyBroker draft

export type EgoProperty = {
  // identifiers
  id?: string | number;
  externalId?: string | number;

  // texts
  title?: string | null;
  description?: string | null;

  // types / status
  propertyType?: string | null; // e.g., "Casa", "Departamento", "Terreno"
  status?: string | null;

  // location
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // features
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  lotSize?: number | null; // m²
  constructionSize?: number | null; // m²

  // operations/prices
  salePrice?: number | null;
  rentPrice?: number | null;
  currency?: string | null; // MXN, USD

  // media
  images?: string[] | null;

  // catch-all (ego often has extra keys)
  [k: string]: any;
};

export type EasyBrokerOperation = {
  type: "sale" | "rental";
  amount?: number;
  currency?: string;
  formatted_amount?: string;
};

export type EasyBrokerDraft = {
  external_id?: string;
  title?: string;
  description?: string;
  property_type?: string; // Casa, Departamento, Terreno, etc
  status?: string;

  // Location: EB list responses accept text or object; for create, EB expects structured location.
  location?: string | {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
  };

  bedrooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  lot_size?: number;
  construction_size?: number;

  operations?: EasyBrokerOperation[];

  property_images?: { url: string }[];
};

