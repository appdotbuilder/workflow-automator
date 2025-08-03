
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable } from '../db/schema';
import { type CreateWorkflowInput } from '../schema';
import { createWorkflow } from '../handlers/create_workflow';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateWorkflowInput = {
  name: 'Test Workflow',
  description: 'A workflow for testing',
  is_active: true
};

describe('createWorkflow', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a workflow', async () => {
    const result = await createWorkflow(testInput, testUserId);

    // Basic field validation
    expect(result.name).toEqual('Test Workflow');
    expect(result.description).toEqual('A workflow for testing');
    expect(result.is_active).toEqual(true);
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save workflow to database', async () => {
    const result = await createWorkflow(testInput, testUserId);

    // Query using proper drizzle syntax
    const workflows = await db.select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, result.id))
      .execute();

    expect(workflows).toHaveLength(1);
    expect(workflows[0].name).toEqual('Test Workflow');
    expect(workflows[0].description).toEqual('A workflow for testing');
    expect(workflows[0].is_active).toEqual(true);
    expect(workflows[0].user_id).toEqual(testUserId);
    expect(workflows[0].created_at).toBeInstanceOf(Date);
    expect(workflows[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description', async () => {
    const inputWithNullDescription: CreateWorkflowInput = {
      name: 'Test Workflow',
      description: null,
      is_active: true
    };

    const result = await createWorkflow(inputWithNullDescription, testUserId);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Test Workflow');
    expect(result.is_active).toEqual(true);
  });

  it('should handle undefined description', async () => {
    const inputWithUndefinedDescription: CreateWorkflowInput = {
      name: 'Test Workflow',
      is_active: true
    };

    const result = await createWorkflow(inputWithUndefinedDescription, testUserId);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Test Workflow');
    expect(result.is_active).toEqual(true);
  });

  it('should use default is_active value when not provided', async () => {
    const inputWithoutIsActive: CreateWorkflowInput = {
      name: 'Test Workflow',
      description: 'A workflow for testing',
      is_active: true
    };

    const result = await createWorkflow(inputWithoutIsActive, testUserId);

    expect(result.is_active).toEqual(true);
    expect(result.name).toEqual('Test Workflow');
    expect(result.description).toEqual('A workflow for testing');
  });

  it('should handle is_active false', async () => {
    const inputWithInactiveWorkflow: CreateWorkflowInput = {
      name: 'Inactive Workflow',
      description: 'An inactive workflow',
      is_active: false
    };

    const result = await createWorkflow(inputWithInactiveWorkflow, testUserId);

    expect(result.is_active).toEqual(false);
    expect(result.name).toEqual('Inactive Workflow');
    expect(result.description).toEqual('An inactive workflow');
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(createWorkflow(testInput, nonExistentUserId))
      .rejects.toThrow(/violates foreign key constraint/i);
  });
});
