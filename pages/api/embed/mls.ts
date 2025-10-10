import type { NextApiRequest, NextApiResponse } from 'next';

const EB_ORIGIN = 'https://sayro-bienes-raices.easybroker.com';
const ALLOWED_PREFIXES = new Set([
  '/',
  '/properties',
  '/rentals',
  '/p',
  '/property',
  '/search_text',
  '/contact',
  '/owners',
]);

function normalizePath(raw?: string): string {
  const p = (raw || '/properties').trim();
  try {
    // Allow full URLs to our EB origin; strip origin to path
    const u = new URL(p, EB_ORIGIN);
    const path = u.pathname + (u.search || '');
    // Whitelist only known entry points
    const ok = Array.from(ALLOWED_PREFIXES).some((pref) => path.startsWith(pref));
    return ok ? path : '/properties';
  } catch {
    return '/properties';
  }
}

function rewriteAnchorsToProxy(html: string): string {
  // 1) Relative anchors to known sections (properties, rentals, p, property, contact, owners, search_text)
  html = html.replace(
    /<a([^>]*?)href=\"\/(properties|rentals|p|property|contact|owners|search_text)([^\"]*)\"/gi,
    (_m, pre: string, seg: string, rest: string) => {
      const q = `/api/embed/mls?path=/${seg}${rest}`;
      // Ensure links stay within the iframe (remove target attribute if present in pre)
      const preNoTarget = pre.replace(/\s*target=\"[^\"]*\"/gi, '');
      return `<a${preNoTarget}href=\"${q}\"`;
    }
  );
  // 2) Full-domain links to EB origin → proxy
  html = html.replace(
    /<a([^>]*?)href=\"https?:\/\/sayro-bienes-raices\.easybroker\.com(\/[^"]*)\"/gi,
    (_m, pre: string, rest: string) => {
      const q = `/api/embed/mls?path=${rest}`;
      const preNoTarget = pre.replace(/\s*target=\"[^\"]*\"/gi, '');
      return `<a${preNoTarget}href=\"${q}\"`;
    }
  );
  // 3) Remove target attribute from any remaining anchors so navigation stays inside iframe
  html = html.replace(/<a([^>]*?)target=\"[^\"]*\"([^>]*?)>/gi, '<a$1$2>');
  return html;
}

function rewriteFormsToProxy(html: string): string {
  // Convert search forms and other internal forms to hit our proxy path
  html = html.replace(
    /<form([^>]*?)action=\"\/(search_text|properties|rentals)([^\"]*)\"/gi,
    (_m, pre: string, seg: string, rest: string) => `<form${pre}action=\"/api/embed/mls?path=/${seg}${rest}\"`
  );
  html = html.replace(
    /<form([^>]*?)action=\"https?:\/\/sayro-bienes-raices\.easybroker\.com(\/[^"]*)\"/gi,
    (_m, pre: string, rest: string) => `<form${pre}action=\"/api/embed/mls?path=${rest}\"`
  );
  return html;
}

function absolutizeAssetUrls(html: string): string {
  // Convert common asset references to absolute EB origin for non-anchor tags
  // link href="/...", script src="/...", img src="/...", source src="/..."
  html = html.replace(/<(link)([^>]*?)href=\"\/(?!api\/embed\/)([^\"]*)\"/gi, (_m, tag, pre, rest) => `<${tag}${pre}href=\"${EB_ORIGIN}/${rest}\"`);
  html = html.replace(/<(script)([^>]*?)src=\"\/(?!api\/embed\/)([^\"]*)\"/gi, (_m, tag, pre, rest) => `<${tag}${pre}src=\"${EB_ORIGIN}/${rest}\"`);
  html = html.replace(/<(img)([^>]*?)src=\"\/(?!api\/embed\/)([^\"]*)\"/gi, (_m, tag, pre, rest) => `<${tag}${pre}src=\"${EB_ORIGIN}/${rest}\"`);
  html = html.replace(/<(source)([^>]*?)src=\"\/(?!api\/embed\/)([^\"]*)\"/gi, (_m, tag, pre, rest) => `<${tag}${pre}src=\"${EB_ORIGIN}/${rest}\"`);
  return html;
}

function stripMetaCSP(html: string): string {
  // Remove meta CSP tags that could deny embedding
  return html.replace(/<meta[^>]+http-equiv=\"Content-Security-Policy\"[^>]*>/gi, '');
}

function injectHideHeaderCSS(html: string): string {
  const css = `\n<style id="embed-hide-eb-header">\n  /* Ocultar navbar/header del sitio embebido */\n  .header, #main_menu, nav#main_menu, nav.navbar, .top-head, .phone-mobile, #website_translator, .search-input, .footer, .pre-footer, .body-footer, .mg-attribution {\n    display: none !important;\n    visibility: hidden !important;\n    height: 0 !important;\n    overflow: hidden !important;\n  }\n  /* Ajustes para evitar espacios superiores sobrantes */\n  body {\n    margin-top: 0 !important;\n    padding-top: 0 !important;\n  }\n  .container, .content, .page, main {\n    margin-top: 0 !important;\n    padding-top: 0 !important;\n  }\n</style>\n`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, css + '</head>');
  return css + html;
}

function injectNavigationScript(html: string): string {
  const js = `\n<script id=\"embed-nav-fix\">(function(){try{\n  function toProxy(url){\n    try{\n      var u=new URL(url, location.href);\n      var path=u.pathname||'/';\n      var allowed=/^\\\/(properties|rentals|p|property|contact|owners|search_text)(\\/|$)/i.test(path);\n      var isEB=/^https?:\\/\\/sayro-bienes-raices\\.easybroker\\.com/i.test(u.href);\n      if(isEB||allowed){\n        return '/api/embed/mls?path='+path+(u.search||'');\n      }\n      return url;\n    }catch(e){return url;}\n  }\n  document.addEventListener('click', function(e){\n    var a=e.target && e.target.closest ? e.target.closest('a[href]') : null;\n    if(!a) return;\n    var href=a.getAttribute('href')||'';\n    if(!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;\n    var next=toProxy(href);\n    if(next && next!==href){ e.preventDefault(); window.location.href=next; }\n  }, true);\n  document.addEventListener('submit', function(e){\n    var f=e.target; if(!f||!f.getAttribute) return;\n    var action=f.getAttribute('action')||''; if(!action) return;\n    var next=toProxy(action); if(next && next!==action) { f.setAttribute('action', next); }\n  }, true);\n} catch(e){}})();</script>\n`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, js + '</body>');
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, js + '</head>');
  return html + js;
}

function injectCustomGallery(html: string): string {
  const css = `\n<style id=\"embed-gallery-css\">\n  .eb-embed-gallery{ width:100%; background:#fff; }\n  .eb-embed-gallery .eg-main{ position:relative; width:100%; background:#000; display:flex; align-items:center; justify-content:center; }\n  .eb-embed-gallery .eg-main img{ width:100%; height:auto; display:block; object-fit:contain; }\n  .eb-embed-gallery .eg-thumbs{ display:flex; gap:8px; overflow-x:auto; padding:10px 4px; background:#f7f7f7; }\n  .eb-embed-gallery .eg-thumbs button{ border:2px solid transparent; padding:0; background:none; border-radius:6px; cursor:pointer; flex:0 0 auto; }\n  .eb-embed-gallery .eg-thumbs button.active{ border-color:#0E3B30; }\n  .eb-embed-gallery .eg-thumbs img{ display:block; height:72px; width:auto; border-radius:4px; }\n</style>\n`;
  const js = `\n<script id=\"embed-gallery-js\">(function(){try{\n  function unique(arr){ var m={},out=[]; for(var i=0;i<arr.length;i++){ var x=arr[i]; if(!x) continue; var k=String(x); if(!m[k]){ m[k]=1; out.push(x); } } return out; }\n  function build(){\n    var slider = document.querySelector('.royal-image-slideshow');\n    if(!slider) return;\n    // Extraer URLs grandes y miniaturas
    var nodes = slider.querySelectorAll('img');\n    var big=[], thumb=[];\n    nodes.forEach(function(img){\n      var bigUrl = img.getAttribute('data-rsbigimg') || img.getAttribute('src');\n      var tmbUrl = img.getAttribute('data-rstmb') || img.getAttribute('src');\n      if(bigUrl) big.push(bigUrl);\n      if(tmbUrl) thumb.push(tmbUrl);\n    });\n    big = unique(big); thumb = unique(thumb);\n    if(!big.length){ return; }\n    // Ocultar slider original
    slider.style.display='none';\n    // Construir galería
    var root = document.createElement('div');\n    root.className='eb-embed-gallery';\n    var main = document.createElement('div');\n    main.className='eg-main';\n    var img = document.createElement('img');\n    img.src = big[0];\n    img.alt = 'Imagen 1';\n    main.appendChild(img);\n    var thumbs = document.createElement('div');\n    thumbs.className='eg-thumbs';\n    big.forEach(function(url, i){\n      var b=document.createElement('button');\n      if(i===0) b.classList.add('active');\n      var ti=document.createElement('img');\n      ti.src = thumb[i] || url;\n      ti.alt = 'Miniatura '+(i+1);\n      b.appendChild(ti);\n      b.addEventListener('click', function(){\n        try {\n          img.src = url;\n          var act=thumbs.querySelector('button.active'); if(act) act.classList.remove('active');\n          b.classList.add('active');\n        } catch(e){}\n      });\n      thumbs.appendChild(b);\n    });\n    root.appendChild(main);\n    root.appendChild(thumbs);\n    slider.parentNode.insertBefore(root, slider.nextSibling);\n  }\n  if(document.readyState==='complete' || document.readyState==='interactive') setTimeout(build, 0); else document.addEventListener('DOMContentLoaded', build);\n} catch(e) { /* ignore */ }} )();</script>\n`;
  if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, css + '</head>'); else html = css + html;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, js + '</body>');
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, js + '</head>');
  return html + js;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }
  const path = normalizePath(String(req.query.path || '/properties'));
  const target = `${EB_ORIGIN}${path}`;

  try {
    const upstream = await fetch(target, {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Safari/537.36',
      },
    });

    const html = await upstream.text();
    let body = html;
    body = stripMetaCSP(body);
    body = rewriteAnchorsToProxy(body);
    body = rewriteFormsToProxy(body);
    body = absolutizeAssetUrls(body);
    body = injectHideHeaderCSS(body);
    body = injectNavigationScript(body);
    body = injectCustomGallery(body);

    // Deliver as HTML; do not include X-Frame-Options/CSP here (global headers already set to allow self)
    res.status(upstream.ok ? 200 : upstream.status);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.send(body);
  } catch (e: any) {
    res.status(502);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!doctype html><html><head><meta charset="utf-8"><title>MLS</title></head><body><p>Lo sentimos, no se pudo cargar el catálogo MLS.</p><pre style="white-space:pre-wrap;color:#555">${(e?.message || String(e))}</pre></body></html>`);
  }
}
