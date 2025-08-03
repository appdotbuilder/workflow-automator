
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { trpc } from '@/utils/trpc';
import type { WorkflowExecution, StepExecution } from '../../../server/src/schema';

interface WorkflowExecutionsProps {
  executions: WorkflowExecution[];
}

export function WorkflowExecutions({ executions }: WorkflowExecutionsProps) {
  const [expandedExecutions, setExpandedExecutions] = useState<Set<number>>(new Set());
  const [executionDetails, setExecutionDetails] = useState<Record<number, StepExecution[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());

  const toggleExpanded = async (executionId: number) => {
    setExpandedExecutions((prev: Set<number>) => {
      const newSet = new Set(prev);
      if (newSet.has(executionId)) {
        newSet.delete(executionId);
      } else {
        newSet.add(executionId);
        // Load execution details if not already loaded
        if (!executionDetails[executionId]) {
          loadExecutionDetails(executionId);
        }
      }
      return newSet;
    });
  };

  const loadExecutionDetails = async (executionId: number) => {
    setLoadingDetails((prev: Set<number>) => new Set(prev).add(executionId));
    try {
      const details = await trpc.getExecutionDetails.query({ executionId });
      setExecutionDetails((prev: Record<number, StepExecution[]>) => ({
        ...prev,
        [executionId]: details.stepExecutions
      }));
    } catch (error) {
      console.error('Failed to load execution details:', error);
    } finally {
      setLoadingDetails((prev: Set<number>) => {
        const newSet = new Set(prev);
        newSet.delete(executionId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '🔄';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const calculateDuration = (started: Date, completed: Date | null) => {
    if (!completed) return 'Running...';
    const duration = completed.getTime() - started.getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Execution History</CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🚀</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No executions yet</h3>
            <p className="text-gray-500">Execute your workflow to see the results here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {executions.map((execution: WorkflowExecution) => (
              <Card key={execution.id} className="border-l-4 border-l-gray-300">
                <Collapsible
                  open={expandedExecutions.has(execution.id)}
                  onOpenChange={() => toggleExpanded(execution.id)}
                >
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getStatusIcon(execution.status)}</span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Execution #{execution.id}</span>
                              <Badge className={getStatusColor(execution.status)}>
                                {execution.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Started: {formatDate(execution.started_at)}
                              {execution.completed_at && (
                                <span className="ml-4">
                                  Duration: {calculateDuration(execution.started_at, execution.completed_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          {expandedExecutions.has(execution.id) ? '▼' : '▶'}
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {execution.error_message && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                          <h5 className="text-sm font-medium text-red-800 mb-1">Error</h5>
                          <p className="text-sm text-red-700">{execution.error_message}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-700">Step Results</h5>
                        
                        {loadingDetails.has(execution.id) ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <span className="text-sm text-gray-500">Loading step details...</span>
                          </div>
                        ) : executionDetails[execution.id] ? (
                          <div className="space-y-2">
                            {executionDetails[execution.id].map((stepExecution: StepExecution) => (
                              <div key={stepExecution.id} className="border rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">{getStatusIcon(stepExecution.status)}</span>
                                    <span className="text-sm font-medium">Step #{stepExecution.step_id}</span>
                                    <Badge className={getStatusColor(stepExecution.status)} variant="outline">
                                      {stepExecution.status}
                                    </Badge>
                                    {stepExecution.response_status && (
                                      <Badge variant="outline">
                                        HTTP {stepExecution.response_status}
                                      </Badge>
                                    )}
                                  </div>
                                  {stepExecution.completed_at && (
                                    <span className="text-xs text-gray-500">
                                      {calculateDuration(stepExecution.started_at, stepExecution.completed_at)}
                                    </span>
                                  )}
                                </div>
                                
                                {stepExecution.error_message && (
                                  <div className="text-xs text-red-600 mb-2">
                                    Error: {stepExecution.error_message}
                                  </div>
                                )}
                                
                                {stepExecution.response_body && (
                                  <div>
                                    <span className="text-xs text-gray-600">Response:</span>
                                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto max-h-32">
                                      {stepExecution.response_body}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Click to load step details</p>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
