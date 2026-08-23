import { completeBackupData } from '@/lib/backup';
import { requireOfflineRequest, offlineErrorResponse } from '@/lib/offline-security';
import { fetchCashTransactions } from '@/lib/services/cashTransactionService';
import { fetchFiles } from '@/lib/services/fileService';
import { fetchInformations } from '@/lib/services/infoService';
import { fetchPortfolio } from '@/lib/services/portfolioService';
import { backupDataSchema } from '@/lib/security/backup-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    requireOfflineRequest(request);
    const [stocks, files, informations, cashTransactions] = await Promise.all([
      fetchPortfolio(),
      fetchFiles(),
      fetchInformations(),
      fetchCashTransactions(),
    ]);

    const backup = completeBackupData({
      version: '5.0 (Complete Local PostgreSQL backup)',
      exported_at: new Date().toISOString(),
      stocks,
      files,
      informations,
      cash_transactions: cashTransactions,
    });

    return Response.json(backupDataSchema.parse(backup), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (caught: unknown) {
    return offlineErrorResponse(caught, 'สร้าง Local Backup ไม่สำเร็จ');
  }
}
