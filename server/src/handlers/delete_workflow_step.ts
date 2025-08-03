
import { db } from '../db';
import { workflowStepsTable, workflowsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteWorkflowStep(stepId: number, userId: number): Promise<{ success: boolean }> {
  try {
    // First, verify that the step exists and belongs to a workflow owned by the user
    const stepWithWorkflow = await db.select({
      stepId: workflowStepsTable.id,
      workflowUserId: workflowsTable.user_id
    })
      .from(workflowStepsTable)
      .innerJoin(workflowsTable, eq(workflowStepsTable.workflow_id, workflowsTable.id))
      .where(eq(workflowStepsTable.id, stepId))
      .execute();

    // Check if step exists
    if (stepWithWorkflow.length === 0) {
      throw new Error('Workflow step not found');
    }

    // Check if the workflow belongs to the authenticated user
    if (stepWithWorkflow[0].workflowUserId !== userId) {
      throw new Error('Unauthorized: workflow step does not belong to user');
    }

    // Delete the workflow step (associated step executions will be cascade deleted)
    const deleteResult = await db.delete(workflowStepsTable)
      .where(eq(workflowStepsTable.id, stepId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Delete workflow step failed:', error);
    throw error;
  }
}
