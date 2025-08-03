
import { db } from '../db';
import { workflowExecutionsTable, workflowsTable } from '../db/schema';
import { type WorkflowExecution } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export async function getWorkflowExecutions(workflowId: number, userId: number): Promise<WorkflowExecution[]> {
  try {
    // First verify that the workflow exists and belongs to the user
    const workflow = await db.select()
      .from(workflowsTable)
      .where(
        and(
          eq(workflowsTable.id, workflowId),
          eq(workflowsTable.user_id, userId)
        )
      )
      .execute();

    if (workflow.length === 0) {
      throw new Error('Workflow not found or access denied');
    }

    // Fetch all executions for the workflow, ordered by started_at (newest first)
    const executions = await db.select()
      .from(workflowExecutionsTable)
      .where(eq(workflowExecutionsTable.workflow_id, workflowId))
      .orderBy(desc(workflowExecutionsTable.started_at))
      .execute();

    return executions;
  } catch (error) {
    console.error('Failed to get workflow executions:', error);
    throw error;
  }
}
