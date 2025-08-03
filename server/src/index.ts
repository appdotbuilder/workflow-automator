
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerInputSchema,
  loginInputSchema,
  createWorkflowInputSchema,
  updateWorkflowInputSchema,
  createWorkflowStepInputSchema,
  updateWorkflowStepInputSchema,
  executeWorkflowInputSchema
} from './schema';

// Import handlers
import { register } from './handlers/register';
import { login } from './handlers/login';
import { createWorkflow } from './handlers/create_workflow';
import { getWorkflows } from './handlers/get_workflows';
import { updateWorkflow } from './handlers/update_workflow';
import { deleteWorkflow } from './handlers/delete_workflow';
import { createWorkflowStep } from './handlers/create_workflow_step';
import { getWorkflowSteps } from './handlers/get_workflow_steps';
import { updateWorkflowStep } from './handlers/update_workflow_step';
import { deleteWorkflowStep } from './handlers/delete_workflow_step';
import { executeWorkflow } from './handlers/execute_workflow';
import { getWorkflowExecutions } from './handlers/get_workflow_executions';
import { getExecutionDetails } from './handlers/get_execution_details';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerInputSchema)
    .mutation(({ input }) => register(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Workflow management routes (require authentication)
  createWorkflow: publicProcedure
    .input(createWorkflowInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return createWorkflow(input, userId);
    }),

  getWorkflows: publicProcedure
    .query(() => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return getWorkflows(userId);
    }),

  updateWorkflow: publicProcedure
    .input(updateWorkflowInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return updateWorkflow(input, userId);
    }),

  deleteWorkflow: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return deleteWorkflow(input.id, userId);
    }),

  // Workflow step management routes
  createWorkflowStep: publicProcedure
    .input(createWorkflowStepInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return createWorkflowStep(input, userId);
    }),

  getWorkflowSteps: publicProcedure
    .input(z.object({ workflowId: z.number() }))
    .query(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return getWorkflowSteps(input.workflowId, userId);
    }),

  updateWorkflowStep: publicProcedure
    .input(updateWorkflowStepInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return updateWorkflowStep(input, userId);
    }),

  deleteWorkflowStep: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return deleteWorkflowStep(input.id, userId);
    }),

  // Workflow execution routes
  executeWorkflow: publicProcedure
    .input(executeWorkflowInputSchema)
    .mutation(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return executeWorkflow(input, userId);
    }),

  getWorkflowExecutions: publicProcedure
    .input(z.object({ workflowId: z.number() }))
    .query(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return getWorkflowExecutions(input.workflowId, userId);
    }),

  getExecutionDetails: publicProcedure
    .input(z.object({ executionId: z.number() }))
    .query(({ input }) => {
      // TODO: Extract userId from JWT token in context
      const userId = 1; // Placeholder - should come from authenticated context
      return getExecutionDetails(input.executionId, userId);
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
