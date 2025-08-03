
import { db } from '../db';
import { workflowsTable } from '../db/schema';
import { type CreateWorkflowInput, type Workflow } from '../schema';

export const createWorkflow = async (input: CreateWorkflowInput, userId: number): Promise<Workflow> => {
  try {
    // Insert workflow record
    const result = await db.insert(workflowsTable)
      .values({
        user_id: userId,
        name: input.name,
        description: input.description || null,
        is_active: input.is_active ?? true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Workflow creation failed:', error);
    throw error;
  }
};
