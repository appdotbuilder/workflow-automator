
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable, workflowStepsTable } from '../db/schema';
import { type UpdateWorkflowStepInput } from '../schema';
import { updateWorkflowStep } from '../handlers/update_workflow_step';
import { eq } from 'drizzle-orm';

describe('updateWorkflowStep', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a workflow step', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create workflow
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

    // Create workflow step
    const stepResult = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflowId,
        name: 'Original Step',
        method: 'GET',
        url: 'https://original.com',
        headers: { 'Authorization': 'Bearer token' },
        body: 'original body',
        step_order: 1
      })
      .returning()
      .execute();
    const stepId = stepResult[0].id;

    const updateInput: UpdateWorkflowStepInput = {
      id: stepId,
      name: 'Updated Step',
      method: 'POST',
      url: 'https://updated.com',
      headers: { 'Content-Type': 'application/json' },
      body: 'updated body',
      step_order: 2
    };

    const result = await updateWorkflowStep(updateInput, userId);

    expect(result.id).toEqual(stepId);
    expect(result.name).toEqual('Updated Step');
    expect(result.method).toEqual('POST');
    expect(result.url).toEqual('https://updated.com');
    expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(result.body).toEqual('updated body');
    expect(result.step_order).toEqual(2);
    expect(result.workflow_id).toEqual(workflowId);
  });

  it('should update only provided fields', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create workflow
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

    // Create workflow step
    const stepResult = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflowId,
        name: 'Original Step',
        method: 'GET',
        url: 'https://original.com',
        headers: { 'Authorization': 'Bearer token' },
        body: 'original body',
        step_order: 1
      })
      .returning()
      .execute();
    const stepId = stepResult[0].id;

    // Update only name and method
    const updateInput: UpdateWorkflowStepInput = {
      id: stepId,
      name: 'Partially Updated Step',
      method: 'PUT'
    };

    const result = await updateWorkflowStep(updateInput, userId);

    expect(result.name).toEqual('Partially Updated Step');
    expect(result.method).toEqual('PUT');
    // Other fields should remain unchanged
    expect(result.url).toEqual('https://original.com');
    expect(result.headers).toEqual({ 'Authorization': 'Bearer token' });
    expect(result.body).toEqual('original body');
    expect(result.step_order).toEqual(1);
  });

  it('should save updated step to database', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create workflow
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

    // Create workflow step
    const stepResult = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflowId,
        name: 'Original Step',
        method: 'GET',
        url: 'https://original.com',
        headers: null,
        body: null,
        step_order: 1
      })
      .returning()
      .execute();
    const stepId = stepResult[0].id;

    const updateInput: UpdateWorkflowStepInput = {
      id: stepId,
      name: 'Database Updated Step',
      headers: { 'X-API-Key': 'secret' }
    };

    await updateWorkflowStep(updateInput, userId);

    // Verify in database
    const steps = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.id, stepId))
      .execute();

    expect(steps).toHaveLength(1);
    expect(steps[0].name).toEqual('Database Updated Step');
    expect(steps[0].headers).toEqual({ 'X-API-Key': 'secret' });
    expect(steps[0].method).toEqual('GET'); // Unchanged
    expect(steps[0].url).toEqual('https://original.com'); // Unchanged
  });

  it('should throw error if step not found', async () => {
    const updateInput: UpdateWorkflowStepInput = {
      id: 99999,
      name: 'Updated Step'
    };

    await expect(updateWorkflowStep(updateInput, 1))
      .rejects.toThrow(/not found or access denied/i);
  });

  it('should throw error if step belongs to different user', async () => {
    // Create first user
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
        description: 'A workflow for user1',
        is_active: true
      })
      .returning()
      .execute();
    const workflowId = workflowResult[0].id;

    // Create step in user1's workflow
    const stepResult = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflowId,
        name: 'User1 Step',
        method: 'GET',
        url: 'https://user1.com',
        headers: null,
        body: null,
        step_order: 1
      })
      .returning()
      .execute();
    const stepId = stepResult[0].id;

    // Try to update with user2
    const updateInput: UpdateWorkflowStepInput = {
      id: stepId,
      name: 'Hacked Step'
    };

    await expect(updateWorkflowStep(updateInput, user2Id))
      .rejects.toThrow(/not found or access denied/i);
  });

  it('should handle null values for headers and body', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create workflow
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

    // Create workflow step with headers and body
    const stepResult = await db.insert(workflowStepsTable)
      .values({
        workflow_id: workflowId,
        name: 'Step with data',
        method: 'POST',
        url: 'https://example.com',
        headers: { 'Authorization': 'Bearer token' },
        body: 'original body',
        step_order: 1
      })
      .returning()
      .execute();
    const stepId = stepResult[0].id;

    // Update to null values
    const updateInput: UpdateWorkflowStepInput = {
      id: stepId,
      headers: null,
      body: null
    };

    const result = await updateWorkflowStep(updateInput, userId);

    expect(result.headers).toBeNull();
    expect(result.body).toBeNull();
  });
});
