
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable } from '../db/schema';
import { type UpdateWorkflowInput } from '../schema';
import { updateWorkflow } from '../handlers/update_workflow';
import { eq, and } from 'drizzle-orm';

describe('updateWorkflow', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testWorkflowId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hashedpassword123'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashedpassword456'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test workflow
    const workflows = await db.insert(workflowsTable)
      .values({
        user_id: testUserId,
        name: 'Original Workflow',
        description: 'Original description',
        is_active: true
      })
      .returning()
      .execute();

    testWorkflowId = workflows[0].id;
  });

  it('should update workflow name', async () => {
    const input: UpdateWorkflowInput = {
      id: testWorkflowId,
      name: 'Updated Workflow Name'
    };

    const result = await updateWorkflow(input, testUserId);

    expect(result.name).toEqual('Updated Workflow Name');
    expect(result.description).toEqual('Original description');
    expect(result.is_active).toEqual(true);
    expect(result.user_id).toEqual(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbWorkflow = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, testWorkflowId))
      .execute();

    expect(dbWorkflow[0].name).toEqual('Updated Workflow Name');
  });

  it('should update workflow description', async () => {
    const input: UpdateWorkflowInput = {
      id: testWorkflowId,
      description: 'New description'
    };

    const result = await updateWorkflow(input, testUserId);

    expect(result.name).toEqual('Original Workflow');
    expect(result.description).toEqual('New description');
    expect(result.is_active).toEqual(true);
  });

  it('should update workflow active status', async () => {
    const input: UpdateWorkflowInput = {
      id: testWorkflowId,
      is_active: false
    };

    const result = await updateWorkflow(input, testUserId);

    expect(result.name).toEqual('Original Workflow');
    expect(result.description).toEqual('Original description');
    expect(result.is_active).toEqual(false);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateWorkflowInput = {
      id: testWorkflowId,
      name: 'Multi-Update Workflow',
      description: 'Multi-update description',
      is_active: false
    };

    const result = await updateWorkflow(input, testUserId);

    expect(result.name).toEqual('Multi-Update Workflow');
    expect(result.description).toEqual('Multi-update description');
    expect(result.is_active).toEqual(false);
    expect(result.user_id).toEqual(testUserId);
  });

  it('should set description to null', async () => {
    const input: UpdateWorkflowInput = {
      id: testWorkflowId,
      description: null
    };

    const result = await updateWorkflow(input, testUserId);

    expect(result.name).toEqual('Original Workflow');
    expect(result.description).toBeNull();
    expect(result.is_active).toEqual(true);
  });

  it('should update the updated_at timestamp', async () => {
    const originalWorkflow = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, testWorkflowId))
      .execute();

    const originalUpdatedAt = originalWorkflow[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateWorkflowInput = {
      id: testWorkflowId,
      name: 'Updated Name'
    };

    const result = await updateWorkflow(input, testUserId);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error if workflow not found', async () => {
    const input: UpdateWorkflowInput = {
      id: 99999,
      name: 'Non-existent'
    };

    expect(updateWorkflow(input, testUserId)).rejects.toThrow(/not found/i);
  });

  it('should throw error if workflow belongs to different user', async () => {
    const input: UpdateWorkflowInput = {
      id: testWorkflowId,
      name: 'Unauthorized Update'
    };

    expect(updateWorkflow(input, otherUserId)).rejects.toThrow(/not found/i);
  });

  it('should not modify workflow when user does not own it', async () => {
    const input: UpdateWorkflowInput = {
      id: testWorkflowId,
      name: 'Unauthorized Update'
    };

    try {
      await updateWorkflow(input, otherUserId);
    } catch (error) {
      // Expected to fail
    }

    // Verify original workflow is unchanged
    const workflow = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, testWorkflowId))
      .execute();

    expect(workflow[0].name).toEqual('Original Workflow');
    expect(workflow[0].description).toEqual('Original description');
    expect(workflow[0].is_active).toEqual(true);
  });
});
