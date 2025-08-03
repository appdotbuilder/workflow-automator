
import { db } from '../db';
import { workflowsTable } from '../db/schema';
import { type UpdateWorkflowInput, type Workflow } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateWorkflow(input: UpdateWorkflowInput, userId: number): Promise<Workflow> {
  try {
    // First, verify the workflow exists and belongs to the user
    const existingWorkflow = await db.select()
      .from(workflowsTable)
      .where(and(
        eq(workflowsTable.id, input.id),
        eq(workflowsTable.user_id, userId)
      ))
      .execute();

    if (existingWorkflow.length === 0) {
      throw new Error('Workflow not found or does not belong to user');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Perform the update
    const result = await db.update(workflowsTable)
      .set(updateData)
      .where(and(
        eq(workflowsTable.id, input.id),
        eq(workflowsTable.user_id, userId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update workflow');
    }

    return result[0];
  } catch (error) {
    console.error('Workflow update failed:', error);
    throw error;
  }
}
