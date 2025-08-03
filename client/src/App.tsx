
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { WorkflowList } from '@/components/WorkflowList';
import { WorkflowForm } from '@/components/WorkflowForm';
import { WorkflowDetails } from '@/components/WorkflowDetails';
import { AuthForm } from '@/components/AuthForm';
import type { Workflow, AuthResponse } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load workflows for authenticated user
  const loadWorkflows = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const result = await trpc.getWorkflows.query();
      setWorkflows(result);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleLogin = (authData: AuthResponse) => {
    setUser(authData.user);
    localStorage.setItem('auth_token', authData.token);
  };

  const handleLogout = () => {
    setUser(null);
    setWorkflows([]);
    setSelectedWorkflow(null);
    localStorage.removeItem('auth_token');
  };

  const handleWorkflowCreated = (workflow: Workflow) => {
    setWorkflows((prev: Workflow[]) => [workflow, ...prev]);
    setShowCreateForm(false);
  };

  const handleWorkflowUpdated = (updatedWorkflow: Workflow) => {
    setWorkflows((prev: Workflow[]) => 
      prev.map((w: Workflow) => w.id === updatedWorkflow.id ? updatedWorkflow : w)
    );
    if (selectedWorkflow?.id === updatedWorkflow.id) {
      setSelectedWorkflow(updatedWorkflow);
    }
  };

  const handleWorkflowDeleted = (workflowId: number) => {
    setWorkflows((prev: Workflow[]) => prev.filter((w: Workflow) => w.id !== workflowId));
    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(null);
    }
  };

  // If not authenticated, show auth form
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Workflow Automation</h1>
            <p className="text-gray-600">Create and manage your API workflows</p>
          </div>
          <AuthForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🔧</span>
              <h1 className="text-xl font-semibold text-gray-900">Workflow Automation</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedWorkflow ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedWorkflow(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Back to Workflows
              </Button>
              <Badge variant={selectedWorkflow.is_active ? "default" : "secondary"}>
                {selectedWorkflow.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <WorkflowDetails 
              workflow={selectedWorkflow}
              onWorkflowUpdated={handleWorkflowUpdated}
              onWorkflowDeleted={handleWorkflowDeleted}
            />
          </div>
        ) : (
          <Tabs defaultValue="workflows" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="workflows">My Workflows</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="workflows" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>📋 Your Workflows</span>
                    <Button 
                      onClick={() => setShowCreateForm(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      + New Workflow
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading workflows...</p>
                    </div>
                  ) : workflows.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="text-4xl mb-4 block">🚀</span>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
                      <p className="text-gray-500 mb-6">Create your first automation workflow to get started!</p>
                      <Button 
                        onClick={() => setShowCreateForm(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Create Your First Workflow
                      </Button>
                    </div>
                  ) : (
                    <WorkflowList 
                      workflows={workflows}
                      onWorkflowSelect={setSelectedWorkflow}
                      onWorkflowDeleted={handleWorkflowDeleted}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>✨ Create New Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <WorkflowForm onWorkflowCreated={handleWorkflowCreated} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  ✨ Create New Workflow
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowForm 
                  onWorkflowCreated={handleWorkflowCreated}
                  onCancel={() => setShowCreateForm(false)}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
