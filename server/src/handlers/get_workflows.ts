
import { db } from '../db';
import { workflowsTable } from '../db/schema';
import { type Workflow } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getWorkflows(userId: number): Promise<Workflow[]> {
  try {
    const results = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.user_id, userId))
      .orderBy(desc(workflowsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Get workflows failed:', error);
    throw error;
  }
}
