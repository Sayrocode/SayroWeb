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
  return {
    accessToken: process.env.META_ACCESS_TOKEN,
    adAccountId: process.env.META_AD_ACCOUNT_ID?.replace(/^act_/, ''),
    pageId: process.env.META_PAGE_ID,
    siteBaseUrl: process.env.SITE_BASE_URL,
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

  // 1) Campaign
  const campaign = await postForm(`/act_${adAccountId}/campaigns`, {
    name,
    objective,
    status, // start paused by default
    special_ad_categories: [],
  }, token);

  // 2) Ad Set
  const adset = await postForm(`/act_${adAccountId}/adsets`, {
    name: `${name} - AdSet`,
    campaign_id: campaign.id,
    billing_event: 'IMPRESSIONS',
    optimization_goal: objective === 'LINK_CLICKS' ? 'LINK_CLICKS' : 'REACH',
    daily_budget: String(dailyBudgetMinor),
    start_time: startTime,
    end_time: endTime,
    targeting: {
      geo_locations: { countries: ['MX'] },
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed'],
      instagram_positions: ['stream'],
    },
    status,
  }, token);

  // 3) Creative
  const creative = await postForm(`/act_${adAccountId}/adcreatives`, {
    name: `${name} Creative`,
    object_story_spec: storySpec,
  }, token);

  // 4) Ad
  const ad = await postForm(`/act_${adAccountId}/ads`, {
    name: `${name} Ad`,
    adset_id: adset.id,
    creative: { creative_id: creative.id },
    status,
  }, token);

  return { campaign, adset, creative, ad };
}

export function limitText(s: string, max: number): string {
  const str = (s || '').replace(/\s+/g, ' ').trim();
  return str.length > max ? str.slice(0, max - 1).trimEnd() + '…' : str;
}

