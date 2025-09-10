import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { requireAdmin, methodNotAllowed } from '../_utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = parseInt(String(req.query.id));
  if (!id) return res.status(400).json({ error: 'ID inválido' });

  if (req.method === 'GET') {
    const prop = await prisma.property.findUnique({ where: { id }, include: { media: { orderBy: { createdAt: 'asc' } } } });
    if (!prop) return res.status(404).json({ error: 'No encontrado' });

    let ebImages: any[] = [];
    let operations: any[] = [];
    let description: string | null = null;
    try { ebImages = prop.propertyImagesJson ? JSON.parse(prop.propertyImagesJson) : []; } catch {}
    try {
      const detail = prop.ebDetailJson ? JSON.parse(prop.ebDetailJson) : null;
      if (detail) {
        if (Array.isArray(detail.operations)) operations = detail.operations;
        if (typeof detail.description === 'string') description = detail.description;
      }
      // Fallback: if no operations in detail, try operationsJson column
      if ((!operations || operations.length === 0) && prop.operationsJson) {
        const ops = JSON.parse(prop.operationsJson);
        if (Array.isArray(ops)) operations = ops;
      }
    } catch {}

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
      'title','titleImageFull','titleImageThumb','propertyType','status','bedrooms','bathrooms','parkingSpaces','lotSize','constructionSize','brokerName','locationText'
    ];
    for (const f of fields) if (f in body) data[f] = body[f];
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
