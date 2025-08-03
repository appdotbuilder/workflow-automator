
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowsTable, workflowExecutionsTable } from '../db/schema';
import { getWorkflowExecutions } from '../handlers/get_workflow_executions';

describe('getWorkflowExecutions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return workflow executions for a valid workflow', async () => {
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

    // Create test executions
    await db.insert(workflowExecutionsTable)
      .values([
        {
          workflow_id: workflow.id,
          status: 'completed',
          started_at: new Date('2024-01-01T10:00:00Z'),
          completed_at: new Date('2024-01-01T10:05:00Z')
        },
        {
          workflow_id: workflow.id,
          status: 'failed',
          started_at: new Date('2024-01-02T10:00:00Z'),
          error_message: 'Test error'
        }
      ])
      .execute();

    const result = await getWorkflowExecutions(workflow.id, user.id);

    expect(result).toHaveLength(2);
    
    // Should be ordered by started_at descending (newest first)
    expect(result[0].started_at.getTime()).toBeGreaterThan(result[1].started_at.getTime());
    expect(result[0].status).toBe('failed');
    expect(result[1].status).toBe('completed');
    
    // Verify all fields are present
    result.forEach(execution => {
      expect(execution.id).toBeDefined();
      expect(execution.workflow_id).toBe(workflow.id);
      expect(execution.status).toMatch(/^(pending|running|completed|failed)$/);
      expect(execution.started_at).toBeInstanceOf(Date);
      expect(execution.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for workflow with no executions', async () => {
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
        description: 'A workflow with no executions',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    const result = await getWorkflowExecutions(workflow.id, user.id);

    expect(result).toHaveLength(0);
  });

  it('should throw error for non-existent workflow', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user = userResult[0];

    await expect(getWorkflowExecutions(999, user.id))
      .rejects.toThrow(/workflow not found or access denied/i);
  });

  it('should throw error when user tries to access another users workflow', async () => {
    // Create first user and workflow
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user1 = user1Result[0];

    const workflowResult = await db.insert(workflowsTable)
      .values({
        user_id: user1.id,
        name: 'User 1 Workflow',
        description: 'A workflow belonging to user 1',
        is_active: true
      })
      .returning()
      .execute();
    const workflow = workflowResult[0];

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    const user2 = user2Result[0];

    // User 2 tries to access User 1's workflow
    await expect(getWorkflowExecutions(workflow.id, user2.id))
      .rejects.toThrow(/workflow not found or access denied/i);
  });

  it('should order executions by started_at descending', async () => {
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

    // Create executions with different timestamps
    const now = new Date();
    const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    await db.insert(workflowExecutionsTable)
      .values([
        {
          workflow_id: workflow.id,
          status: 'completed',
          started_at: twoDaysAgo
        },
        {
          workflow_id: workflow.id,
          status: 'running',
          started_at: now
        },
        {
          workflow_id: workflow.id,
          status: 'failed',
          started_at: anHourAgo
        }
      ])
      .execute();

    const result = await getWorkflowExecutions(workflow.id, user.id);

    expect(result).toHaveLength(3);
    
    // Verify descending order (newest first)
    expect(result[0].started_at.getTime()).toBeGreaterThanOrEqual(result[1].started_at.getTime());
    expect(result[1].started_at.getTime()).toBeGreaterThanOrEqual(result[2].started_at.getTime());
    
    // Verify the actual order matches our expectations
    expect(result[0].status).toBe('running'); // newest (now)
    expect(result[1].status).toBe('failed');  // middle (anHourAgo)
    expect(result[2].status).toBe('completed'); // oldest (twoDaysAgo)
  });
});
