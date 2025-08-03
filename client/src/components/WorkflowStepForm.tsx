
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { CreateWorkflowStepInput, WorkflowStep } from '../../../server/src/schema';

interface WorkflowStepFormProps {
  workflowId: number;
  nextStepOrder: number;
  onStepCreated: (step: WorkflowStep) => void;
  onCancel?: () => void;
}

export function WorkflowStepForm({ workflowId, nextStepOrder, onStepCreated, onCancel }: WorkflowStepFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateWorkflowStepInput>({
    workflow_id: workflowId,
    name: '',
    method: 'GET',
    url: '',
    headers: {},
    body: '',
    step_order: nextStepOrder
  });

  const [headersText, setHeadersText] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Parse headers from JSON string if provided
      let parsedHeaders = undefined;
      if (headersText.trim()) {
        try {
          parsedHeaders = JSON.parse(headersText);
        } catch {
          setError('Invalid JSON format for headers');
          setIsLoading(false);
          return;
        }
      }
      
      const stepData = {
        ...formData,
        headers: parsedHeaders,
        body: formData.body || undefined
      };
      
      const response = await trpc.createWorkflowStep.mutate(stepData);
      onStepCreated(response);
      
      // Reset form
      setFormData({
        workflow_id: workflowId,
        name: '',
        method: 'GET',
        url: '',
        headers: {},
        body: '',
        step_order: nextStepOrder + 1
      });
      setHeadersText('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create step. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="step-name">Step Name *</Label>
          <Input
            id="step-name"
            placeholder="e.g., Fetch User Data"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateWorkflowStepInput) => ({ ...prev, name: e.target.value }))
            }
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="step-method">HTTP Method *</Label>
          <Select
            value={formData.method || 'GET'}
            onValueChange={(value: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE') =>
              setFormData((prev: CreateWorkflowStepInput) => ({ ...prev, method: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="step-url">URL *</Label>
        <Input
          id="step-url"
          type="url"
          placeholder="https://api.example.com/endpoint"
          value={formData.url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateWorkflowStepInput) => ({ ...prev, url: e.target.value }))
          }
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="step-headers">Headers (JSON format)</Label>
        <Textarea
          id="step-headers"
          placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
          value={headersText}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHeadersText(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-gray-500">Optional. Enter headers as valid JSON object.</p>
      </div>
      
      {(['POST', 'PUT', 'PATCH'].includes(formData.method)) && (
        <div className="space-y-2">
          <Label htmlFor="step-body">Request Body</Label>
          <Textarea
            id="step-body"
            placeholder="Request body content (JSON, XML, etc.)"
            value={formData.body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateWorkflowStepInput) => ({ ...prev, body: e.target.value }))
            }
            rows={4}
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="step-order">Step Order</Label>
        <Input
          id="step-order"
          type="number"
          min="1"
          value={formData.step_order}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateWorkflowStepInput) => ({ ...prev, step_order: parseInt(e.target.value) || 1 }))
          }
        />
        <p className="text-xs text-gray-500">Steps are executed in this order.</p>
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
          {isLoading ? 'Adding...' : 'Add Step'}
        </Button>
      </div>
    </form>
  );
}
