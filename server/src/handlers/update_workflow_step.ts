
import { db } from '../db';
import { workflowStepsTable, workflowsTable } from '../db/schema';
import { type UpdateWorkflowStepInput, type WorkflowStep } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateWorkflowStep(input: UpdateWorkflowStepInput, userId: number): Promise<WorkflowStep> {
  try {
    // First verify that the step exists and belongs to a workflow owned by the user
    const stepWithWorkflow = await db.select({
      step: workflowStepsTable,
      workflow: workflowsTable
    })
    .from(workflowStepsTable)
    .innerJoin(workflowsTable, eq(workflowStepsTable.workflow_id, workflowsTable.id))
    .where(
      and(
        eq(workflowStepsTable.id, input.id),
        eq(workflowsTable.user_id, userId)
      )
    )
    .execute();

    if (stepWithWorkflow.length === 0) {
      throw new Error('Workflow step not found or access denied');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof workflowStepsTable.$inferInsert> = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.method !== undefined) {
      updateData.method = input.method;
    }
    
    if (input.url !== undefined) {
      updateData.url = input.url;
    }
    
    if (input.headers !== undefined) {
      updateData.headers = input.headers;
    }
    
    if (input.body !== undefined) {
      updateData.body = input.body;
    }
    
    if (input.step_order !== undefined) {
      updateData.step_order = input.step_order;
    }

    // Update the step
    const result = await db.update(workflowStepsTable)
      .set(updateData)
      .where(eq(workflowStepsTable.id, input.id))
      .returning()
      .execute();

    const updatedStep = result[0];

    // Transform the result to match the expected WorkflowStep type
    return {
      id: updatedStep.id,
      workflow_id: updatedStep.workflow_id,
      name: updatedStep.name,
      method: updatedStep.method,
      url: updatedStep.url,
      headers: updatedStep.headers as Record<string, string> | null,
      body: updatedStep.body,
      step_order: updatedStep.step_order,
      created_at: updatedStep.created_at
    };
  } catch (error) {
    console.error('Workflow step update failed:', error);
    throw error;
  }
}
