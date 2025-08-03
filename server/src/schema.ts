
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Auth schemas
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Workflow step schema
export const workflowStepSchema = z.object({
  id: z.number(),
  workflow_id: z.number(),
  name: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().url(),
  headers: z.record(z.string()).nullable(),
  body: z.string().nullable(),
  step_order: z.number().int(),
  created_at: z.coerce.date()
});

export type WorkflowStep = z.infer<typeof workflowStepSchema>;

// Workflow schema
export const workflowSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Workflow = z.infer<typeof workflowSchema>;

// Workflow execution schema
export const workflowExecutionSchema = z.object({
  id: z.number(),
  workflow_id: z.number(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  error_message: z.string().nullable(),
  created_at: z.coerce.date()
});

export type WorkflowExecution = z.infer<typeof workflowExecutionSchema>;

// Step execution schema
export const stepExecutionSchema = z.object({
  id: z.number(),
  execution_id: z.number(),
  step_id: z.number(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  response_status: z.number().nullable(),
  response_body: z.string().nullable(),
  error_message: z.string().nullable(),
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type StepExecution = z.infer<typeof stepExecutionSchema>;

// Input schemas for creating workflows
export const createWorkflowInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true)
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowInputSchema>;

export const updateWorkflowInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateWorkflowInput = z.infer<typeof updateWorkflowInputSchema>;

// Input schemas for workflow steps
export const createWorkflowStepInputSchema = z.object({
  workflow_id: z.number(),
  name: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  step_order: z.number().int().nonnegative()
});

export type CreateWorkflowStepInput = z.infer<typeof createWorkflowStepInputSchema>;

export const updateWorkflowStepInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string()).nullable().optional(),
  body: z.string().nullable().optional(),
  step_order: z.number().int().nonnegative().optional()
});

export type UpdateWorkflowStepInput = z.infer<typeof updateWorkflowStepInputSchema>;

// Execute workflow input
export const executeWorkflowInputSchema = z.object({
  workflow_id: z.number()
});

export type ExecuteWorkflowInput = z.infer<typeof executeWorkflowInputSchema>;

// Get workflows input (for filtering by user)
export const getWorkflowsInputSchema = z.object({
  user_id: z.number()
});

export type GetWorkflowsInput = z.infer<typeof getWorkflowsInputSchema>;

// Get workflow executions input
export const getWorkflowExecutionsInputSchema = z.object({
  workflow_id: z.number()
});

export type GetWorkflowExecutionsInput = z.infer<typeof getWorkflowExecutionsInputSchema>;
