
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { WorkflowStepList } from '@/components/WorkflowStepList';
import { WorkflowStepForm } from '@/components/WorkflowStepForm';
import { WorkflowExecutions } from '@/components/WorkflowExecutions';
import { WorkflowEditForm } from '@/components/WorkflowEditForm';
import type { Workflow, WorkflowStep, WorkflowExecution } from '../../../server/src/schema';

interface WorkflowDetailsProps {
  workflow: Workflow;
  onWorkflowUpdated: (workflow: Workflow) => void;
  onWorkflowDeleted: (workflowId: number) => void;
}

export function WorkflowDetails({ workflow, onWorkflowUpdated, onWorkflowDeleted }: WorkflowDetailsProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [showStepForm, setShowStepForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Load workflow steps
  const loadSteps = useCallback(async () => {
    try {
      const result = await trpc.getWorkflowSteps.query({ workflowId: workflow.id });
      setSteps(result);
    } catch (error) {
      console.error('Failed to load workflow steps:', error);
    }
  }, [workflow.id]);

  // Load workflow executions
  const loadExecutions = useCallback(async () => {
    try {
      const result = await trpc.getWorkflowExecutions.query({ workflowId: workflow.id });
      setExecutions(result);
    } catch (error) {
      console.error('Failed to load workflow executions:', error);
    }
  }, [workflow.id]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadSteps(), loadExecutions()]).finally(() => {
      setIsLoading(false);
    });
  }, [loadSteps, loadExecutions]);

  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    try {
      await trpc.executeWorkflow.mutate({ workflow_id: workflow.id });
      // Reload executions to show the new one
      await loadExecutions();
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStepCreated = (step: WorkflowStep) => {
    setSteps((prev: WorkflowStep[]) => [...prev, step].sort((a, b) => a.step_order - b.step_order));
    setShowStepForm(false);
  };

  const handleStepDeleted = (stepId: number) => {
    setSteps((prev: WorkflowStep[]) => prev.filter((s: WorkflowStep) => s.id !== stepId));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',  
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-gray-900">{workflow.name}</CardTitle>
              {workflow.description && (
                <p className="text-gray-600 mt-2">{workflow.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                <span>Created: {formatDate(workflow.created_at)}</span>
                <span>Updated: {formatDate(workflow.updated_at)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant={workflow.is_active ? "default" : "secondary"}>
                {workflow.is_active ? "Active" : "Inactive"}
              </Badge>
              <Button
                variant="outline"
                onClick={() => setShowEditForm(true)}
              >
                Edit
              </Button>
              <Button
                onClick={handleExecuteWorkflow}
                disabled={!workflow.is_active || steps.length === 0 || isExecuting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isExecuting ? 'Executing...' : '▶️ Execute'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="steps" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
          <TabsTrigger value="executions">Executions ({executions.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="steps">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>🔗 Workflow Steps</CardTitle>
                <Button
                  onClick={() => setShowStepForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  + Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading steps...</p>
                </div>
              ) : steps.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4 block">⚡</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No steps defined</h3>
                  <p className="text-gray-500 mb-6">Add API call steps to build your workflow automation</p>
                  <Button
                    onClick={() => setShowStepForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add Your First Step
                  </Button>
                </div>
              ) : (
                <WorkflowStepList
                  steps={steps}
                  onStepDeleted={handleStepDeleted}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions">
          <WorkflowExecutions 
            executions={executions}
          />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Workflow Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowEditForm
                workflow={workflow}
                onWorkflowUpdated={onWorkflowUpdated}
                onWorkflowDeleted={onWorkflowDeleted}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Step Modal */}
      {showStepForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                ⚡ Add Workflow Step
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStepForm(false)}
                >
                  ✕
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowStepForm
                workflowId={workflow.id}
                nextStepOrder={steps.length + 1}
                onStepCreated={handleStepCreated}
                onCancel={() => setShowStepForm(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Workflow Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                ✏️ Edit Workflow
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditForm(false)}
                >
                  ✕
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowEditForm
                workflow={workflow}
                onWorkflowUpdated={(updatedWorkflow: Workflow) => {
                  onWorkflowUpdated(updatedWorkflow);
                  setShowEditForm(false);
                }}
                onWorkflowDeleted={onWorkflowDeleted}
                onCancel={() => setShowEditForm(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
