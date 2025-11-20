import type { NextApiRequest } from 'next';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type MetaEnv = {
  accessToken?: string;
  adAccountId?: string; // numeric id without act_
  pageId?: string;
  siteBaseUrl?: string; // e.g. https://sayro.mx
};

export function readMetaEnv(): MetaEnv {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const adRaw = process.env.META_AD_ACCOUNT_ID?.trim();
  const page = process.env.META_PAGE_ID?.trim();
  const site = process.env.SITE_BASE_URL?.trim();
  return {
    accessToken: token,
    adAccountId: adRaw ? adRaw.replace(/^act_/, '') : undefined,
    pageId: page,
    siteBaseUrl: site,
  };
}

export function requireMetaEnv(): Required<MetaEnv> {
  const env = readMetaEnv();
  const missing = [] as string[];
  if (!env.accessToken) missing.push('META_ACCESS_TOKEN');
  if (!env.adAccountId) missing.push('META_AD_ACCOUNT_ID');
  if (!env.pageId) missing.push('META_PAGE_ID');
  if (!env.siteBaseUrl) missing.push('SITE_BASE_URL');
  if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  return env as Required<MetaEnv>;
}

export function getBaseUrlFromReq(req: NextApiRequest): string {
  if (process.env.SITE_BASE_URL) return process.env.SITE_BASE_URL;
  const proto = (req.headers['x-forwarded-proto'] as string) || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  return `${proto}://${req.headers.host}`;
}

async function postForm(path: string, form: Record<string, any>, token: string) {
  const body = new URLSearchParams();
  Object.entries(form).forEach(([k, v]) => body.append(k, typeof v === 'string' ? v : JSON.stringify(v)));
  body.append('access_token', token);
  const r = await fetch(`${GRAPH}${path}`, { method: 'POST', body });
  const text = await r.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (!r.ok) throw new Error(json?.error?.message || text || `HTTP ${r.status}`);
    return json;
  } catch (e) {
    throw new Error(`Meta API ${path} → ${text}`);
  }
}

export type CreativeImage = { url: string; hash?: string };

export async function uploadImages(adAccountId: string, token: string, images: CreativeImage[]): Promise<CreativeImage[]> {
  // Prefer Facebook Business SDK
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bizSdk = require('facebook-nodejs-business-sdk');
    const api = bizSdk.FacebookAdsApi.init(token);
    try { if (process.env.NODE_ENV !== 'production') api.setDebug(true); } catch {}
    const AdAccount = bizSdk.AdAccount;
    const account = new AdAccount(`act_${adAccountId}`);
    const out: CreativeImage[] = [];
    for (const img of images) {
      try {
        const resp = await account.createAdImage([], { url: img.url });
        const hash = resp?.images?.[Object.keys(resp.images || {})[0]]?.hash || resp?.hash;
        out.push({ url: img.url, hash });
      } catch {
        out.push({ url: img.url });
      }
    }
    return out;
  } catch {
    // Fallback to REST if SDK not available
    const out: CreativeImage[] = [];
    for (const img of images) {
      try {
        const resp = await postForm(`/act_${adAccountId}/adimages`, { url: img.url }, token);
        const hash = resp?.images?.[Object.keys(resp.images)[0]]?.hash || resp?.hash;
        out.push({ url: img.url, hash });
      } catch (e) {
        // if upload fails, keep url to use directly
        out.push({ url: img.url });
      }
    }
    return out;
  }
}

export async function createCampaign(params: {
  name: string;
  objective?: string; // e.g., OUTCOME_TRAFFIC or LINK_CLICKS
  status?: 'PAUSED' | 'ACTIVE';
  dailyBudgetMinor: number; // e.g., cents
  startTime?: string; // ISO
  endTime?: string; // ISO
  adAccountId: string;
  pageId: string;
  token: string;
  storySpec: any; // object_story_spec
  targeting?: any; // optional targeting override (e.g., regions)
}) {
  const {
    name,
    objective = 'OUTCOME_TRAFFIC',
    status = 'PAUSED',
    dailyBudgetMinor,
    startTime,
    endTime,
    adAccountId,
    pageId,
    token,
    storySpec,
  } = params;

  // 1) Campaign (SDK)
  // Prefer Node SDK for safety and stability
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bizSdk = require('facebook-nodejs-business-sdk');
  const api = bizSdk.FacebookAdsApi.init(token);
  try { if (process.env.NODE_ENV !== 'production') api.setDebug(true); } catch {}
  const AdAccount = bizSdk.AdAccount;
  const account = new AdAccount(`act_${adAccountId}`);

  const campaign = await account.createCampaign([], {
    name,
    objective,
    status,
    special_ad_categories: [],
  });

  // 2) Ad Set (SDK)
  // Derivar optimization_goal a partir del objective (v19)
  const optimizationGoal = (() => {
    switch (objective) {
      case 'OUTCOME_TRAFFIC':
        return 'LINK_CLICKS';
      case 'LINK_CLICKS':
        return 'LINK_CLICKS';
      case 'OUTCOME_REACH':
        return 'REACH';
      default:
        return 'LINK_CLICKS';
    }
  })();

  const defaultTargeting = {
    geo_locations: { countries: ['MX'] },
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream'],
  };
  const adset = await account.createAdSet([], {
    name: `${name} - AdSet`,
    campaign_id: campaign.id,
    billing_event: 'IMPRESSIONS',
    optimization_goal: optimizationGoal,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    daily_budget: String(dailyBudgetMinor),
    start_time: startTime,
    end_time: endTime,
    targeting: params.targeting || defaultTargeting,
    status,
  });

  // 3) Creative (SDK)
  const creative = await account.createAdCreative([], {
    name: `${name} Creative`,
    object_story_spec: storySpec,
  });

  // 4) Ad (SDK)
  const ad = await account.createAd([], {
    name: `${name} Ad`,
    adset_id: adset.id,
    creative: { creative_id: creative.id },
    status,
  });

  return { campaign, adset, creative, ad };
}

export function limitText(s: string, max: number): string {
  const str = (s || '').replace(/\s+/g, ' ').trim();
  return str.length > max ? str.slice(0, max - 1).trimEnd() + '…' : str;
}

// --- Geo helpers for Ads targeting ---
function normAscii(s: string): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function getJson(pathWithQuery: string) {
  const r = await fetch(`${GRAPH}${pathWithQuery}`);
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { throw new Error(`Meta API GET ${pathWithQuery} → ${txt}`); }
}

export async function resolveMXRegionTargeting(regionName: string, token: string) {
  const q = encodeURIComponent(regionName);
  const url = `/search?type=adgeolocation&location_types=["region"]&q=${q}&country_code=MX&access_token=${encodeURIComponent(token)}`;
  try {
    const j = await getJson(url);
    const data: any[] = Array.isArray(j?.data) ? j.data : [];
    const normTarget = normAscii(regionName);
    const match = data.find((it: any) => normAscii(it?.name || '').includes(normTarget) && (it?.type === 'region' || it?.type === 'region_key'))
      || data[0];
    if (match && match.key) {
      return {
        geo_locations: {
          countries: ['MX'],
          regions: [{ key: String(match.key) }],
          location_types: ['home', 'recent'],
        },
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions: ['feed'],
        instagram_positions: ['stream'],
      };
    }
  } catch (e) {
    // ignore and use default
  }
  return null;
}

// Resolve a list of Mexican cities (municipios/alcaldías) into targeting keys
export async function resolveMXCitiesTargeting(cityNames: string[], token: string) {
  const cities: { key: string }[] = [];
  for (const name of cityNames) {
    const q = encodeURIComponent(name);
    const url = `/search?type=adgeolocation&location_types=["city"]&q=${q}&country_code=MX&limit=25&access_token=${encodeURIComponent(token)}`;
    try {
      const j = await getJson(url);
      const data: any[] = Array.isArray(j?.data) ? j.data : [];
      const normTarget = normAscii(name);
      const match = data.find((it: any) => normAscii(it?.name || '').includes(normTarget) && (it?.type === 'city' || it?.type === 'city_key'))
        || data[0];
      if (match?.key) cities.push({ key: String(match.key) });
    } catch {}
  }
  if (cities.length) {
    return {
      geo_locations: {
        countries: ['MX'],
        cities,
        location_types: ['home', 'recent'],
      },
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed'],
      instagram_positions: ['stream'],
    };
  }
  return null;
}
