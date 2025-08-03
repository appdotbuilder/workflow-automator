
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable } from '../db/schema';
import { getWorkflows } from '../handlers/get_workflows';

describe('getWorkflows', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no workflows', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getWorkflows(userId);

    expect(result).toEqual([]);
  });

  it('should return workflows for the specified user', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create first workflow
    await db.insert(workflowsTable)
      .values({
        user_id: userId,
        name: 'First Workflow',
        description: 'First test workflow',
        is_active: true
      })
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second workflow
    await db.insert(workflowsTable)
      .values({
        user_id: userId,
        name: 'Second Workflow',
        description: 'Second test workflow',
        is_active: false
      })
      .execute();

    const result = await getWorkflows(userId);

    expect(result).toHaveLength(2);
    // Should be ordered by creation date (newest first)
    expect(result[0].name).toEqual('Second Workflow');
    expect(result[0].description).toEqual('Second test workflow');
    expect(result[0].is_active).toBe(false);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('First Workflow');
    expect(result[1].description).toEqual('First test workflow');
    expect(result[1].is_active).toBe(true);
    expect(result[1].user_id).toEqual(userId);
  });

  it('should return workflows ordered by creation date (newest first)', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create workflows with slight delay to ensure different timestamps
    const firstWorkflow = await db.insert(workflowsTable)
      .values({
        user_id: userId,
        name: 'First Workflow',
        description: 'Created first',
        is_active: true
      })
      .returning()
      .execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondWorkflow = await db.insert(workflowsTable)
      .values({
        user_id: userId,
        name: 'Second Workflow',
        description: 'Created second',
        is_active: true
      })
      .returning()
      .execute();

    const result = await getWorkflows(userId);

    expect(result).toHaveLength(2);
    // Second workflow should come first (newest first)
    expect(result[0].name).toEqual('Second Workflow');
    expect(result[1].name).toEqual('First Workflow');
    
    // Verify ordering by comparing timestamps
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should only return workflows for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword456'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create workflows for both users
    await db.insert(workflowsTable)
      .values([
        {
          user_id: user1Id,
          name: 'User 1 Workflow',
          description: 'Belongs to user 1',
          is_active: true
        },
        {
          user_id: user2Id,
          name: 'User 2 Workflow',
          description: 'Belongs to user 2',
          is_active: true
        }
      ])
      .execute();

    const user1Workflows = await getWorkflows(user1Id);
    const user2Workflows = await getWorkflows(user2Id);

    expect(user1Workflows).toHaveLength(1);
    expect(user1Workflows[0].name).toEqual('User 1 Workflow');
    expect(user1Workflows[0].user_id).toEqual(user1Id);

    expect(user2Workflows).toHaveLength(1);
    expect(user2Workflows[0].name).toEqual('User 2 Workflow');
    expect(user2Workflows[0].user_id).toEqual(user2Id);
  });
});
