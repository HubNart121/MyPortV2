import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { requireOfflineRequest, offlineErrorResponse } from '@/lib/offline-security';
import { getSupabase } from '@/lib/supabase';
import type { FileResource } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeDownloadName(value: string): string {
  return value.replace(/[\r\n"\\/]/g, '_').slice(0, 200) || 'download';
}

async function findRecord(id: string): Promise<FileResource | null> {
  const { data, error } = await getSupabase().from('files').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as FileResource | null;
}

type LocalFileRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: LocalFileRouteContext) {
  try {
    requireOfflineRequest(request);
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });
    const record = await findRecord(id);
    if (!record?.stored_name || !UUID_PATTERN.test(record.stored_name)) return new Response(null, { status: 404 });

    const uploadDir = process.env.LOCAL_UPLOAD_DIR || '/data/uploads';
    const body = await readFile(path.join(/* turbopackIgnore: true */ uploadDir, record.stored_name));
    return new Response(body, {
      headers: {
        'Content-Type': record.mime_type || 'application/octet-stream',
        'Content-Length': String(body.byteLength),
        'Content-Disposition': `attachment; filename="${safeDownloadName(record.original_name || record.name)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (caught: unknown) {
    return offlineErrorResponse(caught, 'อ่านไฟล์จาก Local Volume ไม่สำเร็จ');
  }
}

export async function DELETE(request: Request, context: LocalFileRouteContext) {
  try {
    requireOfflineRequest(request, true);
    const { id } = await context.params;
    if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });
    const url = new URL(request.url);
    const uploadDir = process.env.LOCAL_UPLOAD_DIR || '/data/uploads';

    if (url.searchParams.get('binaryOnly') === '1') {
      await unlink(path.join(/* turbopackIgnore: true */ uploadDir, id)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
      return new Response(null, { status: 204 });
    }

    const record = await findRecord(id);
    if (!record) return new Response(null, { status: 404 });
    if (record.stored_name && UUID_PATTERN.test(record.stored_name)) {
      await unlink(path.join(/* turbopackIgnore: true */ uploadDir, record.stored_name)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    const { error } = await getSupabase().from('files').delete().eq('id', id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (caught: unknown) {
    return offlineErrorResponse(caught, 'ลบไฟล์ Local ไม่สำเร็จ');
  }
}
