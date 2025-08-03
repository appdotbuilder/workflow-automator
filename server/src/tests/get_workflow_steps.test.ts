
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable, workflowStepsTable } from '../db/schema';
import { getWorkflowSteps } from '../handlers/get_workflow_steps';

describe('getWorkflowSteps', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return workflow steps ordered by step_order', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
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

    // Create test steps in non-sequential order to test sorting
    await db.insert(workflowStepsTable)
      .values([
        {
          workflow_id: workflowId,
          name: 'Third Step',
          method: 'POST',
          url: 'https://api.example.com/third',
          headers: { 'Content-Type': 'application/json' },
          body: '{"step": 3}',
          step_order: 3
        },
        {
          workflow_id: workflowId,
          name: 'First Step',
          method: 'GET',
          url: 'https://api.example.com/first',
          headers: null,
          body: null,
          step_order: 1
        },
        {
          workflow_id: workflowId,
          name: 'Second Step',
          method: 'PUT',
          url: 'https://api.example.com/second',
          headers: { 'Authorization': 'Bearer token' },
          body: '{"step": 2}',
          step_order: 2
        }
      ])
      .execute();

    const result = await getWorkflowSteps(workflowId, userId);

    // Should return 3 steps
    expect(result).toHaveLength(3);

    // Should be ordered by step_order
    expect(result[0].name).toEqual('First Step');
    expect(result[0].step_order).toEqual(1);
    expect(result[0].method).toEqual('GET');
    expect(result[0].url).toEqual('https://api.example.com/first');
    expect(result[0].headers).toBeNull();
    expect(result[0].body).toBeNull();

    expect(result[1].name).toEqual('Second Step');
    expect(result[1].step_order).toEqual(2);
    expect(result[1].method).toEqual('PUT');
    expect(result[1].url).toEqual('https://api.example.com/second');
    expect(result[1].headers).toEqual({ 'Authorization': 'Bearer token' });
    expect(result[1].body).toEqual('{"step": 2}');

    expect(result[2].name).toEqual('Third Step');
    expect(result[2].step_order).toEqual(3);
    expect(result[2].method).toEqual('POST');
    expect(result[2].url).toEqual('https://api.example.com/third');
    expect(result[2].headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result[2].body).toEqual('{"step": 3}');

    // All steps should have required fields
    result.forEach(step => {
      expect(step.id).toBeDefined();
      expect(step.workflow_id).toEqual(workflowId);
      expect(step.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for workflow with no steps', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test workflow
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: userId,
        name: 'Empty Workflow',
        description: 'A workflow with no steps',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    const result = await getWorkflowSteps(workflowId, userId);

    expect(result).toHaveLength(0);
  });

  it('should throw error when workflow does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const nonExistentWorkflowId = 99999;

    await expect(getWorkflowSteps(nonExistentWorkflowId, userId))
      .rejects.toThrow(/workflow not found or access denied/i);
  });

  it('should throw error when workflow belongs to different user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create workflow for user1
    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user1Id,
        name: 'User1 Workflow',
        description: 'A workflow belonging to user1',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    // Try to access workflow with user2's ID
    await expect(getWorkflowSteps(workflowId, user2Id))
      .rejects.toThrow(/workflow not found or access denied/i);
  });
});
