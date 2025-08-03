
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable, workflowStepsTable, stepExecutionsTable, workflowExecutionsTable } from '../db/schema';
import { deleteWorkflowStep } from '../handlers/delete_workflow_step';
import { eq } from 'drizzle-orm';

describe('deleteWorkflowStep', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a workflow step successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test workflow
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: userId,
        name: 'Test Workflow',
        description: 'Test workflow description',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    // Create test workflow step
    const stepResult = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflowId,
        name: 'Test Step',
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: { 'Content-Type': 'application/json' },
        body: null,
        step_order: 1
      })
      .returning()
      .execute();
    const stepId = stepResult[0].id;

    // Delete the step
    const result = await deleteWorkflowStep(stepId, userId);

    // Verify successful deletion
    expect(result.success).toBe(true);

    // Verify step is deleted from database
    const deletedStep = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.id, stepId))
      .execute();

    expect(deletedStep).toHaveLength(0);
  });

  it('should throw error when step does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const nonExistentStepId = 999;

    // Attempt to delete non-existent step
    await expect(deleteWorkflowStep(nonExistentStepId, userId)).rejects.toThrow(/not found/i);
  });

  it('should throw error when step belongs to different user', async () => {
    // Create first user and their workflow/step
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create workflow for user1
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user1Id,
        name: 'User1 Workflow',
        description: 'Workflow for user1',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    // Create step for user1's workflow
    const stepResult = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflowId,
        name: 'User1 Step',
        method: 'POST',
        url: 'https://api.example.com/user1',
        headers: null,
        body: '{"test": true}',
        step_order: 1
      })
      .returning()
      .execute();
    const stepId = stepResult[0].id;

    // Attempt to delete user1's step as user2
    await expect(deleteWorkflowStep(stepId, user2Id)).rejects.toThrow(/unauthorized/i);
  });

  it('should cascade delete associated step executions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test workflow
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: userId,
        name: 'Test Workflow',
        description: 'Test workflow description',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    // Create test workflow step
    const stepResult = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflowId,
        name: 'Test Step',
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: null,
        body: null,
        step_order: 1
      })
      .returning()
      .execute();
    const stepId = stepResult[0].id;

    // Create workflow execution
    const executionResult = await db.insert(workflowExecutionsTable)
      .values({
        workflow_id: workflowId,
        status: 'completed'
      })
      .returning()
      .execute();
    const executionId = executionResult[0].id;

    // Create step execution
    await db.insert(stepExecutionsTable)
      .values({
        execution_id: executionId,
        step_id: stepId,
        status: 'completed',
        response_status: 200,
        response_body: '{"success": true}',
        error_message: null
      })
      .execute();

    // Verify step execution exists before deletion
    const stepExecutionsBefore = await db.select()
      .from(stepExecutionsTable)
      .where(eq(stepExecutionsTable.step_id, stepId))
      .execute();
    expect(stepExecutionsBefore).toHaveLength(1);

    // Delete the step
    await deleteWorkflowStep(stepId, userId);

    // Verify step executions are cascade deleted
    const stepExecutionsAfter = await db.select()
      .from(stepExecutionsTable)
      .where(eq(stepExecutionsTable.step_id, stepId))
      .execute();
    expect(stepExecutionsAfter).toHaveLength(0);
  });
});
