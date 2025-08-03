
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable, workflowStepsTable } from '../db/schema';
import { type CreateWorkflowStepInput } from '../schema';
import { createWorkflowStep } from '../handlers/create_workflow_step';
import { eq } from 'drizzle-orm';

describe('createWorkflowStep', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testWorkflowId: number;
  let otherUserId: number;
  let otherWorkflowId: number;

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    testUserId = users[0].id;

    // Create another user for ownership tests
    const otherUsers = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    otherUserId = otherUsers[0].id;

    // Create test workflow
    const workflows = await db.insert(workflowsTable)
      .values({
        user_id: testUserId,
        name: 'Test Workflow',
        description: 'A workflow for testing'
      })
      .returning()
      .execute();
    testWorkflowId = workflows[0].id;

    // Create workflow for other user
    const otherWorkflows = await db.insert(workflowsTable)
      .values({
        user_id: otherUserId,
        name: 'Other Workflow',
        description: 'Another workflow'
      })
      .returning()
      .execute();
    otherWorkflowId = otherWorkflows[0].id;
  });

  const testInput: CreateWorkflowStepInput = {
    workflow_id: 0, // Will be set in tests
    name: 'Test Step',
    method: 'GET',
    url: 'https://api.example.com/test',
    headers: { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' },
    body: '{"test": true}',
    step_order: 1
  };

  it('should create a workflow step', async () => {
    const input = { ...testInput, workflow_id: testWorkflowId };
    const result = await createWorkflowStep(input, testUserId);

    expect(result.name).toEqual('Test Step');
    expect(result.method).toEqual('GET');
    expect(result.url).toEqual('https://api.example.com/test');
    expect(result.headers).toEqual({ 'Authorization': 'Bearer token', 'Content-Type': 'application/json' });
    expect(result.body).toEqual('{"test": true}');
    expect(result.step_order).toEqual(1);
    expect(result.workflow_id).toEqual(testWorkflowId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save workflow step to database', async () => {
    const input = { ...testInput, workflow_id: testWorkflowId };
    const result = await createWorkflowStep(input, testUserId);

    const steps = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.id, result.id))
      .execute();

    expect(steps).toHaveLength(1);
    expect(steps[0].name).toEqual('Test Step');
    expect(steps[0].method).toEqual('GET');
    expect(steps[0].url).toEqual('https://api.example.com/test');
    expect(steps[0].headers).toEqual({ 'Authorization': 'Bearer token', 'Content-Type': 'application/json' });
    expect(steps[0].body).toEqual('{"test": true}');
    expect(steps[0].step_order).toEqual(1);
    expect(steps[0].workflow_id).toEqual(testWorkflowId);
    expect(steps[0].created_at).toBeInstanceOf(Date);
  });

  it('should create step with null headers and body', async () => {
    const input = {
      workflow_id: testWorkflowId,
      name: 'Simple Step',
      method: 'GET' as const,
      url: 'https://api.example.com/simple',
      step_order: 0
    };

    const result = await createWorkflowStep(input, testUserId);

    expect(result.headers).toBeNull();
    expect(result.body).toBeNull();
    expect(result.name).toEqual('Simple Step');
  });

  it('should throw error when workflow does not exist', async () => {
    const input = { ...testInput, workflow_id: 99999 };

    await expect(createWorkflowStep(input, testUserId)).rejects.toThrow(/workflow not found/i);
  });

  it('should throw error when workflow belongs to different user', async () => {
    const input = { ...testInput, workflow_id: otherWorkflowId };

    await expect(createWorkflowStep(input, testUserId)).rejects.toThrow(/does not belong to the authenticated user/i);
  });

  it('should allow creating multiple steps for same workflow', async () => {
    const input1 = { ...testInput, workflow_id: testWorkflowId, name: 'Step 1', step_order: 1 };
    const input2 = { ...testInput, workflow_id: testWorkflowId, name: 'Step 2', step_order: 2 };

    const result1 = await createWorkflowStep(input1, testUserId);
    const result2 = await createWorkflowStep(input2, testUserId);

    expect(result1.name).toEqual('Step 1');
    expect(result2.name).toEqual('Step 2');
    expect(result1.step_order).toEqual(1);
    expect(result2.step_order).toEqual(2);
    expect(result1.workflow_id).toEqual(testWorkflowId);
    expect(result2.workflow_id).toEqual(testWorkflowId);
  });
});
