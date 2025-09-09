// Copied from src/lib/easybroker.ts
const EB_API_BASE = "https://api.easybroker.com/v1";

function requireKey() {
  const key = process.env.EASYBROKER_API_KEY;
  if (!key) {
    throw new Error("EASYBROKER_API_KEY no está configurada en el entorno del servidor");
  }
  return key;
}

export async function getProperties(params: Record<string, string | number> = {}) {
  const key = requireKey();
  const qs = new URLSearchParams({ limit: "24", page: "1" });
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));

  // TIP: si quieres asegurarte solo publicadas:
  // if (!qs.has("search[statuses][]")) qs.append("search[statuses][]", "published");

  const url = `${EB_API_BASE}/properties?${qs}`;
  const res = await fetch(url, {
    headers: { "X-Authorization": key, Accept: "application/json" },
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  if (!res.ok) {
    throw new Error(`EasyBroker ${res.status}: ${text || "Error desconocido"}`);
  }

  return json; // trae { pagination, content: [...] }
}
