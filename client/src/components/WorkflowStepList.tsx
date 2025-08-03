
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { trpc } from '@/utils/trpc';
import type { WorkflowStep } from '../../../server/src/schema';

interface WorkflowStepListProps {
  steps: WorkflowStep[];
  onStepDeleted: (stepId: number) => void;
}

export function WorkflowStepList({ steps, onStepDeleted }: WorkflowStepListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const handleDelete = async (stepId: number) => {
    setDeletingId(stepId);
    try {
      await trpc.deleteWorkflowStep.mutate({ id: stepId });
      onStepDeleted(stepId);
    } catch (error) {
      console.error('Failed to delete step:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpanded = (stepId: number) => {
    setExpandedSteps((prev: Set<number>) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'PATCH': return 'bg-orange-100 text-orange-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {steps.map((step: WorkflowStep) => (
        <Card key={step.id} className="border-l-4 border-l-blue-500">
          <Collapsible
            open={expandedSteps.has(step.id)}
            onOpenChange={() => toggleExpanded(step.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center space-x-3 cursor-pointer flex-1">
                    <span className="text-sm font-medium text-gray-500">#{step.step_order}</span>
                    <h4 className="font-semibold text-gray-900">{step.name}</h4>
                    <Badge className={getMethodColor(step.method)}>
                      {step.method}
                    </Badge>
                    <span className="text-sm text-gray-500 truncate max-w-md">{step.url}</span>
                    <Button variant="ghost" size="sm" className="ml-auto">
                      {expandedSteps.has(step.id) ? '▼' : '▶'}
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <div className="flex items-center space-x-2 ml-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                        disabled={deletingId === step.id}
                      >
                        {deletingId === step.id ? '...' : 'Delete'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Step</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete step "{step.name}"? This action cannot be undone.
                        
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(step.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">URL</h5>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded block break-all">
                      {step.url}
                    </code>
                  </div>
                  
                  {step.headers && Object.keys(step.headers).length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Headers</h5>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(step.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {step.body && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Request Body</h5>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32">
                        {step.body}
                      </pre>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Created: {step.created_at.toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
