
import { db } from '../db';
import { workflowsTable, workflowExecutionsTable, workflowStepsTable, stepExecutionsTable } from '../db/schema';
import { type ExecuteWorkflowInput, type WorkflowExecution } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export async function executeWorkflow(input: ExecuteWorkflowInput, userId: number): Promise<WorkflowExecution> {
  try {
    // 1. Verify that workflow belongs to the authenticated user and is active
    const workflows = await db.select()
      .from(workflowsTable)
      .where(
        and(
          eq(workflowsTable.id, input.workflow_id),
          eq(workflowsTable.user_id, userId),
          eq(workflowsTable.is_active, true)
        )
      )
      .execute();

    if (workflows.length === 0) {
      throw new Error('Workflow not found or not accessible');
    }

    // 2. Create workflow execution record with 'pending' status
    const executionResult = await db.insert(workflowExecutionsTable)
      .values({
        workflow_id: input.workflow_id,
        status: 'pending',
        started_at: new Date(),
        completed_at: null,
        error_message: null
      })
      .returning()
      .execute();

    const execution = executionResult[0];

    // 3. Queue the workflow for background execution
    // For now, we'll execute immediately in a background promise
    // In production, this would be sent to a queue like Redis or a job queue
    executeWorkflowSteps(execution.id, input.workflow_id).catch(error => {
      console.error('Background workflow execution failed:', error);
    });

    return execution;
  } catch (error) {
    console.error('Workflow execution initiation failed:', error);
    throw error;
  }
}

// Background execution function
async function executeWorkflowSteps(executionId: number, workflowId: number): Promise<void> {
  try {
    // Update execution status to 'running'
    await db.update(workflowExecutionsTable)
      .set({ status: 'running' })
      .where(eq(workflowExecutionsTable.id, executionId))
      .execute();

    // Get workflow steps ordered by step_order
    const steps = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflow_id, workflowId))
      .orderBy(asc(workflowStepsTable.step_order))
      .execute();

    // Execute each step in order
    for (const step of steps) {
      try {
        // Create step execution record
        const stepExecutionResult = await db.insert(stepExecutionsTable)
          .values({
            execution_id: executionId,
            step_id: step.id,
            status: 'running',
            started_at: new Date()
          })
          .returning()
          .execute();

        const stepExecution = stepExecutionResult[0];

        // Prepare request options
        const requestOptions: RequestInit = {
          method: step.method,
          headers: {
            'Content-Type': 'application/json',
            ...(step.headers as Record<string, string> || {})
          }
        };

        if (step.body && ['POST', 'PUT', 'PATCH'].includes(step.method)) {
          requestOptions.body = step.body;
        }

        // Execute HTTP request
        const response = await fetch(step.url, requestOptions);
        const responseBody = await response.text();

        // Update step execution with success
        await db.update(stepExecutionsTable)
          .set({
            status: 'completed',
            response_status: response.status,
            response_body: responseBody,
            completed_at: new Date()
          })
          .where(eq(stepExecutionsTable.id, stepExecution.id))
          .execute();

      } catch (stepError) {
        // Update step execution with failure
        await db.update(stepExecutionsTable)
          .set({
            status: 'failed',
            error_message: stepError instanceof Error ? stepError.message : 'Unknown error',
            completed_at: new Date()
          })
          .where(eq(stepExecutionsTable.id, executionId))
          .execute();

        throw stepError;
      }
    }

    // Update workflow execution status to 'completed'
    await db.update(workflowExecutionsTable)
      .set({
        status: 'completed',
        completed_at: new Date()
      })
      .where(eq(workflowExecutionsTable.id, executionId))
      .execute();

  } catch (error) {
    // Update workflow execution status to 'failed'
    await db.update(workflowExecutionsTable)
      .set({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date()
      })
      .where(eq(workflowExecutionsTable.id, executionId))
      .execute();
  }
}
