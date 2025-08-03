
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable, workflowStepsTable, workflowExecutionsTable } from '../db/schema';
import { deleteWorkflow } from '../handlers/delete_workflow';
import { eq } from 'drizzle-orm';

describe('deleteWorkflow', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a workflow that belongs to the user', async () => {
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
        description: 'A test workflow',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    // Delete the workflow
    const result = await deleteWorkflow(workflowId, userId);

    expect(result.success).toBe(true);

    // Verify workflow was deleted
    const workflows = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, workflowId))
      .execute();

    expect(workflows).toHaveLength(0);
  });

  it('should throw error when workflow does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to delete non-existent workflow
    await expect(deleteWorkflow(999, userId))
      .rejects.toThrow(/workflow not found or access denied/i);
  });

  it('should throw error when workflow belongs to different user', async () => {
    // Create first user and workflow
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

    // Create workflow owned by user1
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user1Id,
        name: 'User 1 Workflow',
        description: 'Workflow belonging to user 1',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    // Try to delete workflow as user2
    await expect(deleteWorkflow(workflowId, user2Id))
      .rejects.toThrow(/workflow not found or access denied/i);

    // Verify workflow still exists
    const workflows = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, workflowId))
      .execute();

    expect(workflows).toHaveLength(1);
  });

  it('should cascade delete related workflow steps and executions', async () => {
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
        name: 'Test Workflow with Steps',
        description: 'A workflow with steps and executions',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    // Create workflow step
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

    // Create workflow execution
    const executionResult = await db.insert(workflowExecutionsTable)
      .values({
        workflow_id: workflowId,
        status: 'completed',
        error_message: null
      })
      .returning()
      .execute();

    // Delete the workflow
    const result = await deleteWorkflow(workflowId, userId);

    expect(result.success).toBe(true);

    // Verify workflow was deleted
    const workflows = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, workflowId))
      .execute();

    expect(workflows).toHaveLength(0);

    // Verify steps were cascade deleted
    const steps = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflow_id, workflowId))
      .execute();

    expect(steps).toHaveLength(0);

    // Verify executions were cascade deleted
    const executions = await db.select()
      .from(workflowExecutionsTable)
      .where(eq(workflowExecutionsTable.workflow_id, workflowId))
      .execute();

    expect(executions).toHaveLength(0);
  });
});
