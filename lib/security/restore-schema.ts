import { z } from 'zod';
import { backupCategoryCountsSchema } from './backup-schema';

export const restoreResponseSchema = z.object({
  ok: z.literal(true),
  counts: backupCategoryCountsSchema,
  recovery_id: z.string().min(1),
});

export type RestoreResponse = z.infer<typeof restoreResponseSchema>;
