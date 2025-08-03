
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable, workflowStepsTable, workflowExecutionsTable, stepExecutionsTable } from '../db/schema';
import { getExecutionDetails } from '../handlers/get_execution_details';

describe('getExecutionDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get execution details with step executions', async () => {
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
        description: 'Test workflow description',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    // Create workflow steps
    const step1Result = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflow.id,
        name: 'First Step',
        method: 'GET',
        url: 'https://api.example.com/first',
        headers: { 'Authorization': 'Bearer token' },
        body: null,
        step_order: 1
      })
      .returning()
      .execute();
    const step1 = step1Result[0];

    const step2Result = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflow.id,
        name: 'Second Step',
        method: 'POST',
        url: 'https://api.example.com/second',
        headers: null,
        body: '{"test": "data"}',
        step_order: 2
      })
      .returning()
      .execute();
    const step2 = step2Result[0];

    // Create workflow execution
    const executionResult = await db.insert(workflowExecutionsTable)
      .values({
        workflow_id: workflow.id,
        status: 'completed',
        started_at: new Date(),
        completed_at: new Date()
      })
      .returning()
      .execute();
    const execution = executionResult[0];

    // Create step executions
    await db.insert(stepExecutionsTable)
      .values([
        {
          execution_id: execution.id,
          step_id: step2.id,
          status: 'completed',
          response_status: 201,
          response_body: '{"created": true}',
          started_at: new Date(),
          completed_at: new Date()
        },
        {
          execution_id: execution.id,
          step_id: step1.id,
          status: 'completed',
          response_status: 200,
          response_body: '{"success": true}',
          started_at: new Date(),
          completed_at: new Date()
        }
      ])
      .execute();

    const result = await getExecutionDetails(execution.id, user.id);

    // Verify execution details
    expect(result.execution.id).toEqual(execution.id);
    expect(result.execution.workflow_id).toEqual(workflow.id);
    expect(result.execution.status).toEqual('completed');
    expect(result.execution.started_at).toBeInstanceOf(Date);
    expect(result.execution.completed_at).toBeInstanceOf(Date);

    // Verify step executions are ordered by step_order
    expect(result.stepExecutions).toHaveLength(2);
    expect(result.stepExecutions[0].step_id).toEqual(step1.id); // step_order 1
    expect(result.stepExecutions[1].step_id).toEqual(step2.id); // step_order 2

    // Verify step execution details
    expect(result.stepExecutions[0].status).toEqual('completed');
    expect(result.stepExecutions[0].response_status).toEqual(200);
    expect(result.stepExecutions[0].response_body).toEqual('{"success": true}');

    expect(result.stepExecutions[1].status).toEqual('completed');
    expect(result.stepExecutions[1].response_status).toEqual(201);
    expect(result.stepExecutions[1].response_body).toEqual('{"created": true}');
  });

  it('should throw error when execution not found', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user = userResult[0];

    await expect(getExecutionDetails(999, user.id))
      .rejects.toThrow(/execution not found or does not belong to user/i);
  });

  it('should throw error when execution belongs to different user', async () => {
    // Create two test users
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
        description: 'Workflow for user1',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    // Create execution for user1's workflow
    const executionResult = await db.insert(workflowExecutionsTable)
      .values({
        workflow_id: workflow.id,
        status: 'completed'
      })
      .returning()
      .execute();
    const execution = executionResult[0];

    // Try to access execution as user2
    await expect(getExecutionDetails(execution.id, user2.id))
      .rejects.toThrow(/execution not found or does not belong to user/i);
  });

  it('should handle execution with no step executions', async () => {
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
        name: 'Empty Workflow',
        description: 'Workflow with no steps',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    // Create workflow execution without steps
    const executionResult = await db.insert(workflowExecutionsTable)
      .values({
        workflow_id: workflow.id,
        status: 'pending'
      })
      .returning()
      .execute();
    const execution = executionResult[0];

    const result = await getExecutionDetails(execution.id, user.id);

    expect(result.execution.id).toEqual(execution.id);
    expect(result.stepExecutions).toHaveLength(0);
  });
});
