
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/utils/trpc';
import type { CreateWorkflowInput, Workflow } from '../../../server/src/schema';

interface WorkflowFormProps {
  onWorkflowCreated: (workflow: Workflow) => void;
  onCancel?: () => void;
}

export function WorkflowForm({ onWorkflowCreated, onCancel }: WorkflowFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateWorkflowInput>({
    name: '',
    description: null,
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await trpc.createWorkflow.mutate(formData);
      onWorkflowCreated(response);
      
      // Reset form
      setFormData({
        name: '',
        description: null,
        is_active: true
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create workflow. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workflow-name">Workflow Name *</Label>
        <Input
          id="workflow-name"
          placeholder="e.g., Daily Data Sync"
          value={formData.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateWorkflowInput) => ({ ...prev, name: e.target.value }))
          }
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="workflow-description">Description</Label>
        <Textarea
          id="workflow-description"
          placeholder="Describe what this workflow does..."
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateWorkflowInput) => ({
              ...prev,
              description: e.target.value || null
            }))
          }
          rows={3}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label htmlFor="workflow-active">Active</Label>
          <p className="text-sm text-gray-500">Enable this workflow for execution</p>
        </div>
        <Switch
          id="workflow-active"
          checked={formData.is_active}
          onCheckedChange={(checked: boolean) =>
            setFormData((prev: CreateWorkflowInput) => ({ ...prev, is_active: checked }))
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
          {isLoading ? 'Creating...' : 'Create Workflow'}
        </Button>
      </div>
    </form>
  );
}
