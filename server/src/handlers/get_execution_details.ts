
import { db } from '../db';
import { workflowExecutionsTable, stepExecutionsTable, workflowStepsTable, workflowsTable } from '../db/schema';
import { type WorkflowExecution, type StepExecution } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export async function getExecutionDetails(executionId: number, userId: number): Promise<{
    execution: WorkflowExecution;
    stepExecutions: StepExecution[];
}> {
    try {
        // First, verify that the execution exists and belongs to the user's workflow
        const executionResult = await db.select()
            .from(workflowExecutionsTable)
            .innerJoin(workflowsTable, eq(workflowExecutionsTable.workflow_id, workflowsTable.id))
            .where(
                and(
                    eq(workflowExecutionsTable.id, executionId),
                    eq(workflowsTable.user_id, userId)
                )
            )
            .execute();

        if (executionResult.length === 0) {
            throw new Error('Execution not found or does not belong to user');
        }

        const execution = executionResult[0].workflow_executions;

        // Fetch all step executions for this execution, ordered by step_order
        const stepExecutionsResult = await db.select()
            .from(stepExecutionsTable)
            .innerJoin(workflowStepsTable, eq(stepExecutionsTable.step_id, workflowStepsTable.id))
            .where(eq(stepExecutionsTable.execution_id, executionId))
            .orderBy(asc(workflowStepsTable.step_order))
            .execute();

        const stepExecutions = stepExecutionsResult.map(result => result.step_executions);

        return {
            execution,
            stepExecutions
        };
    } catch (error) {
        console.error('Get execution details failed:', error);
        throw error;
    }
}
