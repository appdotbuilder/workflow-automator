
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import type { Workflow } from '../../../server/src/schema';

interface WorkflowListProps {
  workflows: Workflow[];
  onWorkflowSelect: (workflow: Workflow) => void;
  onWorkflowDeleted: (workflowId: number) => void;
}

export function WorkflowList({ workflows, onWorkflowSelect, onWorkflowDeleted }: WorkflowListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (workflowId: number) => {
    setDeletingId(workflowId);
    try {
      await trpc.deleteWorkflow.mutate({ id: workflowId });
      onWorkflowDeleted(workflowId);
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    } finally {
      setDeletingId(null);
    }
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
    <div className="space-y-4">
      {workflows.map((workflow: Workflow) => (
        <Card key={workflow.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                <Badge variant={workflow.is_active ? "default" : "secondary"}>
                  {workflow.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onWorkflowSelect(workflow)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  View Details
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                      disabled={deletingId === workflow.id}
                    >
                      {deletingId === workflow.id ? '...' : 'Delete'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{workflow.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(workflow.id)}
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
          <CardContent>
            {workflow.description && (
              <p className="text-gray-600 mb-3">{workflow.description}</p>
            )}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Created: {formatDate(workflow.created_at)}</span>
              <span>Updated: {formatDate(workflow.updated_at)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
