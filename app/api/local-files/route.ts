import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { requireOfflineRequest, offlineErrorResponse } from '@/lib/offline-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    requireOfflineRequest(request, true);
    const form = await request.formData();
    const uploaded = form.get('file');
    if (!(uploaded instanceof File)) {
      return Response.json({ error: { message: 'ไม่พบไฟล์อัปโหลด' } }, { status: 400 });
    }
    if (uploaded.size <= 0 || uploaded.size > MAX_FILE_BYTES) {
      return Response.json({ error: { message: 'ไฟล์ต้องมีขนาดไม่เกิน 20 MB' } }, { status: 413 });
    }

    const uploadDir = process.env.LOCAL_UPLOAD_DIR || '/data/uploads';
    const storedName = randomUUID();
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ uploadDir, storedName), Buffer.from(await uploaded.arrayBuffer()), { flag: 'wx' });

    return Response.json({
      storage_kind: 'local',
      stored_name: storedName,
      original_name: uploaded.name.slice(0, 500),
      mime_type: (uploaded.type || 'application/octet-stream').slice(0, 255),
      size_bytes: uploaded.size,
    }, { status: 201 });
  } catch (caught: unknown) {
    return offlineErrorResponse(caught, 'อัปโหลดไฟล์เข้า Local Volume ไม่สำเร็จ');
  }
}
