"use client";

import { FlowBuilder } from "@/components/flow-builder/flow-builder";
import { useFlowStore } from "@/stores/flow-store";
import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, use } from "react";
import { BuilderNode } from "@/components/flow-builder/components/blocks/types";
import { nanoid } from "nanoid";

export default function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const setWorkflow = useFlowStore((s) => s.actions.setWorkflow);

  useEffect(() => {
    // Initialize with a default workflow
    // In production, you would fetch the workflow from API based on id
    setWorkflow({
      id: id,
      name: "My Workflow",
      nodes: [
        {
          id: nanoid(),
          type: BuilderNode.START,
          position: { x: 100, y: 200 },
          data: { label: "Start", deletable: false },
        },
        {
          id: nanoid(),
          type: BuilderNode.END,
          position: { x: 500, y: 200 },
          data: { label: "End", deletable: false },
        },
      ],
      edges: [],
      sidebar: {
        active: "none",
        panels: {
          nodeProperties: {
            selectedNode: null,
          },
        },
      },
    });
  }, [id, setWorkflow]);

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-full">
        <FlowBuilder />
      </div>
    </ReactFlowProvider>
  );
}
