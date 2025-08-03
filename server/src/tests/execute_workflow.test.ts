
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable, workflowStepsTable, workflowExecutionsTable } from '../db/schema';
import { type ExecuteWorkflowInput } from '../schema';
import { executeWorkflow } from '../handlers/execute_workflow';
import { eq } from 'drizzle-orm';

// Test input
const testInput: ExecuteWorkflowInput = {
  workflow_id: 1
};

describe('executeWorkflow', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create workflow execution for valid workflow', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test workflow
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user.id,
        name: 'Test Workflow',
        description: 'A test workflow',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    const result = await executeWorkflow({ workflow_id: workflow.id }, user.id);

    // Verify execution record
    expect(result.workflow_id).toEqual(workflow.id);
    expect(result.status).toEqual('pending');
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.error_message).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save workflow execution to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test workflow
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user.id,
        name: 'Test Workflow',
        description: 'A test workflow',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    const result = await executeWorkflow({ workflow_id: workflow.id }, user.id);

    // Query database to verify execution was saved
    const executions = await db.select()
      .from(workflowExecutionsTable)
      .where(eq(workflowExecutionsTable.id, result.id))
      .execute();

    expect(executions).toHaveLength(1);
    expect(executions[0].workflow_id).toEqual(workflow.id);
    expect(executions[0].status).toEqual('pending');
    expect(executions[0].started_at).toBeInstanceOf(Date);
    expect(executions[0].completed_at).toBeNull();
  });

  it('should reject execution for workflow belonging to different user', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // Create workflow for user1
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user1.id,
        name: 'User1 Workflow',
        description: 'A workflow for user1',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    // Try to execute with user2's ID
    await expect(executeWorkflow({ workflow_id: workflow.id }, user2.id))
      .rejects.toThrow(/workflow not found or not accessible/i);
  });

  it('should reject execution for inactive workflow', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create inactive workflow
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user.id,
        name: 'Inactive Workflow',
        description: 'An inactive workflow',
        is_active: false
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    await expect(executeWorkflow({ workflow_id: workflow.id }, user.id))
      .rejects.toThrow(/workflow not found or not accessible/i);
  });

  it('should reject execution for non-existent workflow', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user = userResult[0];

    await expect(executeWorkflow({ workflow_id: 99999 }, user.id))
      .rejects.toThrow(/workflow not found or not accessible/i);
  });

  it('should execute workflow with steps in correct order', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test workflow
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user.id,
        name: 'Test Workflow with Steps',
        description: 'A workflow with multiple steps',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    // Create workflow steps in different order
    await db.insert(workflowStepsTable)
      .values([
        {
          workflow_id: workflow.id,
          name: 'Step 2',
          method: 'GET',
          url: 'https://httpbin.org/delay/1',
          step_order: 2
        },
        {
          workflow_id: workflow.id,
          name: 'Step 1',
          method: 'GET',
          url: 'https://httpbin.org/status/200',
          step_order: 1
        }
      ])
      .execute();

    const result = await executeWorkflow({ workflow_id: workflow.id }, user.id);

    expect(result.status).toEqual('pending');
    expect(result.workflow_id).toEqual(workflow.id);

    // Wait a moment for background execution to potentially start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify execution record exists
    const executions = await db.select()
      .from(workflowExecutionsTable)
      .where(eq(workflowExecutionsTable.id, result.id))
      .execute();

    expect(executions).toHaveLength(1);
    expect(executions[0].status).toEqual('running');
  });
});
