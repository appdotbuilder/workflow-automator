
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { UpdateWorkflowInput, Workflow } from '../../../server/src/schema';

interface WorkflowEditFormProps {
  workflow: Workflow;
  onWorkflowUpdated: (workflow: Workflow) => void;
  onWorkflowDeleted: (workflowId: number) => void;
  onCancel?: () => void;
}

export function WorkflowEditForm({ workflow, onWorkflowUpdated, onWorkflowDeleted, onCancel }: WorkflowEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UpdateWorkflowInput>({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    is_active: workflow.is_active
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await trpc.updateWorkflow.mutate(formData);
      onWorkflowUpdated(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update workflow. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await trpc.deleteWorkflow.mutate({ id: workflow.id });
      onWorkflowDeleted(workflow.id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete workflow. Please try again.';
      setError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-workflow-name">Workflow Name *</Label>
          <Input
            id="edit-workflow-name"
            placeholder="e.g., Daily Data Sync"
            value={formData.name || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: UpdateWorkflowInput) => ({ ...prev, name: e.target.value }))
            }
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="edit-workflow-description">Description</Label>
          <Textarea
            id="edit-workflow-description"
            placeholder="Describe what this workflow does..."
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: UpdateWorkflowInput) => ({
                ...prev,
                description: e.target.value || null
              }))
            }
            rows={3}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="edit-workflow-active">Active</Label>
            <p className="text-sm text-gray-500">Enable this workflow for execution</p>
          </div>
          <Switch
            id="edit-workflow-active"
            checked={formData.is_active}
            onCheckedChange={(checked: boolean) =>
              setFormData((prev: UpdateWorkflowInput) => ({ ...prev, is_active: checked }))
            }
          />
        </div>
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}
        
        <div className="flex space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Updating...' : 'Update Workflow'}
          </Button>
        </div>
      </form>

      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Danger Zone</h4>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-800 hover:border-red-300"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Workflow'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{workflow.name}"? This will also delete all associated steps and execution history. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
