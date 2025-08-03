
import { db } from '../db';
import { workflowsTable, workflowStepsTable } from '../db/schema';
import { type CreateWorkflowStepInput, type WorkflowStep } from '../schema';
import { eq } from 'drizzle-orm';

export async function createWorkflowStep(input: CreateWorkflowStepInput, userId: number): Promise<WorkflowStep> {
  try {
    // First verify that the workflow exists and belongs to the authenticated user
    const workflows = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, input.workflow_id))
      .execute();

    if (workflows.length === 0) {
      throw new Error('Workflow not found');
    }

    const workflow = workflows[0];
    if (workflow.user_id !== userId) {
      throw new Error('Workflow does not belong to the authenticated user');
    }

    // Create the workflow step
    const result = await db.insert(workflowStepsTable)
      .values({
        workflow_id: input.workflow_id,
        name: input.name,
        method: input.method,
        url: input.url,
        headers: input.headers || null,
        body: input.body || null,
        step_order: input.step_order
      })
      .returning()
      .execute();

    const step = result[0];
    
    // Return with properly typed headers
    return {
      ...step,
      headers: step.headers as Record<string, string> | null
    };
  } catch (error) {
    console.error('Workflow step creation failed:', error);
    throw error;
  }
}
