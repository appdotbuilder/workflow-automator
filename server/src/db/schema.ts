
import { serial, text, pgTable, timestamp, boolean, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// HTTP methods enum
export const httpMethodEnum = pgEnum('http_method', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

// Execution status enum
export const executionStatusEnum = pgEnum('execution_status', ['pending', 'running', 'completed', 'failed']);

// Workflows table
export const workflowsTable = pgTable('workflows', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Workflow steps table
export const workflowStepsTable = pgTable('workflow_steps', {
  id: serial('id').primaryKey(),
  workflow_id: integer('workflow_id').notNull().references(() => workflowsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  method: httpMethodEnum('method').notNull(),
  url: text('url').notNull(),
  headers: jsonb('headers'), // Store headers as JSON
  body: text('body'),
  step_order: integer('step_order').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Workflow executions table
export const workflowExecutionsTable = pgTable('workflow_executions', {
  id: serial('id').primaryKey(),
  workflow_id: integer('workflow_id').notNull().references(() => workflowsTable.id, { onDelete: 'cascade' }),
  status: executionStatusEnum('status').notNull().default('pending'),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Step executions table
export const stepExecutionsTable = pgTable('step_executions', {
  id: serial('id').primaryKey(),
  execution_id: integer('execution_id').notNull().references(() => workflowExecutionsTable.id, { onDelete: 'cascade' }),
  step_id: integer('step_id').notNull().references(() => workflowStepsTable.id, { onDelete: 'cascade' }),
  status: executionStatusEnum('status').notNull().default('pending'),
  response_status: integer('response_status'),
  response_body: text('response_body'),
  error_message: text('error_message'),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  workflows: many(workflowsTable),
}));

export const workflowsRelations = relations(workflowsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [workflowsTable.user_id],
    references: [usersTable.id],
  }),
  steps: many(workflowStepsTable),
  executions: many(workflowExecutionsTable),
}));

export const workflowStepsRelations = relations(workflowStepsTable, ({ one, many }) => ({
  workflow: one(workflowsTable, {
    fields: [workflowStepsTable.workflow_id],
    references: [workflowsTable.id],
  }),
  executions: many(stepExecutionsTable),
}));

export const workflowExecutionsRelations = relations(workflowExecutionsTable, ({ one, many }) => ({
  workflow: one(workflowsTable, {
    fields: [workflowExecutionsTable.workflow_id],
    references: [workflowsTable.id],
  }),
  stepExecutions: many(stepExecutionsTable),
}));

export const stepExecutionsRelations = relations(stepExecutionsTable, ({ one }) => ({
  execution: one(workflowExecutionsTable, {
    fields: [stepExecutionsTable.execution_id],
    references: [workflowExecutionsTable.id],
  }),
  step: one(workflowStepsTable, {
    fields: [stepExecutionsTable.step_id],
    references: [workflowStepsTable.id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  workflows: workflowsTable,
  workflowSteps: workflowStepsTable,
  workflowExecutions: workflowExecutionsTable,
  stepExecutions: stepExecutionsTable,
};
