import { eq } from 'drizzle-orm';
import { DEFAULT_TIMEZONE } from '@tutor-finance/shared';
import type { Database } from '../db/client.js';
import { userSettings } from '../db/schema.js';

export async function getUserTimeZone(db: Database, userId: string): Promise<string> {
  const [row] = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return row?.timezone ?? DEFAULT_TIMEZONE;
}
