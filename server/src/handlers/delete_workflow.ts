
import { db } from '../db';
import { workflowsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteWorkflow(workflowId: number, userId: number): Promise<{ success: boolean }> {
  try {
    // Delete the workflow, but only if it belongs to the authenticated user
    // Using cascade delete defined in schema to handle related records
    const result = await db.delete(workflowsTable)
      .where(and(
        eq(workflowsTable.id, workflowId),
        eq(workflowsTable.user_id, userId)
      ))
      .returning()
      .execute();

    // If no rows were affected, workflow either doesn't exist or doesn't belong to user
    if (result.length === 0) {
      throw new Error('Workflow not found or access denied');
    }

    return { success: true };
  } catch (error) {
    console.error('Workflow deletion failed:', error);
    throw error;
  }
}
