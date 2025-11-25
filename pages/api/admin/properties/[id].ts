import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(String(req.query.id));
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  if (req.method === 'GET') {
    const prop = await prisma.property.findUnique({ where: { id }, include: { media: { orderBy: { createdAt: 'desc' } } } });
    if (!prop) return res.status(404).json({ error: 'No encontrado' });

    let ebImages: any[] = [];
    let operations: any[] = [];
    let description: string | null = null;
    try { ebImages = prop.propertyImagesJson ? JSON.parse(prop.propertyImagesJson) : []; } catch {}
    try {
      const detail = prop.ebDetailJson ? JSON.parse(prop.ebDetailJson) : null;
      if (detail) {
        if (!ebImages.length && Array.isArray(detail.property_images)) ebImages = detail.property_images;
        else if (!ebImages.length && Array.isArray(detail.images)) ebImages = detail.images;
        if (Array.isArray(detail.operations)) operations = detail.operations;
        if (typeof detail.description === 'string') description = detail.description;
      }
      // Fallback: if no operations in detail, try operationsJson column
      if ((!operations || operations.length === 0) && prop.operationsJson) {
        const ops = JSON.parse(prop.operationsJson);
        if (Array.isArray(ops)) operations = ops;
      }
    } catch {}

    // If EB property has no cached images/details, fetch directly from EasyBroker to hydrate
    if (!ebImages.length && prop.publicId?.toUpperCase().startsWith('EB-') && process.env.EASYBROKER_API_KEY) {
      try {
        const ebRes = await fetch(`https://api.easybroker.com/v1/properties/${encodeURIComponent(prop.publicId)}`, {
          headers: {
            accept: 'application/json',
            'X-Authorization': process.env.EASYBROKER_API_KEY as string,
          },
        });
        if (ebRes.ok) {
          const ebDetail = await ebRes.json();
          const imgs = Array.isArray(ebDetail?.property_images) ? ebDetail.property_images
            : Array.isArray(ebDetail?.images) ? ebDetail.images
            : [];
          if (imgs.length) ebImages = imgs;
          if ((!operations || operations.length === 0) && Array.isArray(ebDetail?.operations)) operations = ebDetail.operations;
          if (!description && typeof ebDetail?.description === 'string') description = ebDetail.description;
          // Persist fetched detail for future calls (best-effort)
          const data: any = {};
          try { data.ebDetailJson = JSON.stringify(ebDetail); } catch {}
          try { if (imgs.length) data.propertyImagesJson = JSON.stringify(imgs); } catch {}
          if (Object.keys(data).length) {
            await prisma.property.update({ where: { id }, data });
          }
        }
      } catch (e) {
        // Swallow EB fetch errors to avoid breaking admin read
      }
    }

    return res.status(200).json({
      id: prop.id,
      publicId: prop.publicId,
      title: prop.title,
      titleImageFull: prop.titleImageFull,
      titleImageThumb: prop.titleImageThumb,
      propertyType: prop.propertyType,
      status: prop.status,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      parkingSpaces: prop.parkingSpaces,
      lotSize: prop.lotSize,
      constructionSize: prop.constructionSize,
      brokerName: prop.brokerName,
      locationText: prop.locationText,
      media: prop.media.map((m) => ({ key: m.key, mimeType: m.mimeType, size: m.size, filename: m.filename })),
      ebImages,
      operations,
      description,
    });
  }

  if (req.method === 'PUT') {
    const body = req.body || {};
    const data: any = {};
    const fields = [
      'publicId','title','titleImageFull','titleImageThumb','propertyType','status','bedrooms','bathrooms','parkingSpaces','lotSize','constructionSize','brokerName','locationText'
    ];
    for (const f of fields) if (f in body) data[f] = body[f];
    // Allow updating operations (price/offers)
    if (Array.isArray(body.operations)) {
      try {
        data.operationsJson = JSON.stringify(body.operations);
      } catch {
        // ignore serialization error
      }
      // Also mirror into ebDetailJson.operations when possible, keeping other keys
      const current = await prisma.property.findUnique({ where: { id }, select: { ebDetailJson: true } });
      try {
        const j = current?.ebDetailJson ? JSON.parse(current.ebDetailJson) : {};
        j.operations = body.operations;
        data.ebDetailJson = JSON.stringify(j);
      } catch {
        // fallback: write minimal ebDetailJson
        try { data.ebDetailJson = JSON.stringify({ operations: body.operations }); } catch {}
      }
    }
    // Optional: update EB detail blob directly
    if (body.eb_detail) {
      try { data.ebDetailJson = typeof body.eb_detail === 'string' ? body.eb_detail : JSON.stringify(body.eb_detail); } catch {}
    }
    // Optional: update embedded description inside ebDetailJson
    if (typeof body.description === 'string') {
      const current = await prisma.property.findUnique({ where: { id }, select: { ebDetailJson: true } });
      try {
        const j = current?.ebDetailJson ? JSON.parse(current.ebDetailJson) : {};
        j.description = body.description;
        data.ebDetailJson = JSON.stringify(j);
      } catch {
        data.ebDetailJson = JSON.stringify({ description: body.description });
      }
    }
    // Optional: update propertyImagesJson with an array of { url }
    if (Array.isArray(body.property_images)) {
      try { data.propertyImagesJson = JSON.stringify(body.property_images); } catch {}
    }
    const updated = await prisma.property.update({ where: { id }, data });
    return res.status(200).json({ ok: true, id: updated.id });
  }

  if (req.method === 'DELETE') {
    // Cascade deletes MediaObject by relation
    await prisma.property.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
}
