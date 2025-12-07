"use client";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";

export default function WorkflowsPage() {
  const router = useRouter();

  const handleCreateWorkflow = () => {
    const newId = nanoid();
    router.push(`/workflow/${newId}`);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">
            Create and manage your AI workflows
          </p>
        </div>
        <Button onClick={handleCreateWorkflow}>
          <Icon icon="material-symbols:add" className="size-5 mr-2" />
          Create Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={handleCreateWorkflow}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon icon="material-symbols:add-circle-outline" className="size-5" />
              New Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click to create a new workflow
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
