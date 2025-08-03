
import { db } from '../db';
import { workflowsTable, workflowStepsTable } from '../db/schema';
import { type WorkflowStep } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export async function getWorkflowSteps(workflowId: number, userId: number): Promise<WorkflowStep[]> {
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

    // Fetch all steps for the workflow ordered by step_order
    const steps = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflow_id, workflowId))
      .orderBy(asc(workflowStepsTable.step_order))
      .execute();

    // Transform the results to match the expected type
    return steps.map(step => ({
      ...step,
      headers: step.headers as Record<string, string> | null
    }));
  } catch (error) {
    console.error('Get workflow steps failed:', error);
    throw error;
  }
}
