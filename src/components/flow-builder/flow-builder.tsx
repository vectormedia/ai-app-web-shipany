"use client";

import {
  Background,
  type EdgeTypes,
  type NodeChange,
  ReactFlow,
  useReactFlow,
  SelectionMode,
  Controls,
} from "@xyflow/react";
import { useCallback } from "react";
import { useDeleteKeyCode } from "@/hooks/use-delete-key-code";
import CustomDeletableEdge from "./components/edges/custom-deletable-edge";
import { useDragDropFlowBuilder } from "@/hooks/use-drag-drop-flow-builder";
import { useFlowStore } from "@/stores/flow-store";
import { NODE_TYPES } from "./components/blocks";
import { BuilderNode } from "./components/blocks/types";
import { Button } from "@/shared/components/ui/button";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import "@xyflow/react/dist/style.css";

const edgeTypes: EdgeTypes = {
  deletable: CustomDeletableEdge,
};

export const FlowBuilder = () => {
  const router = useRouter();
  const name = useFlowStore((s) => s.workflow.name);
  const nodes = useFlowStore((s) => s.workflow.nodes);
  const edges = useFlowStore((s) => s.workflow.edges);
  const onNodesChange = useFlowStore((s) => s.actions.nodes.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.actions.edges.onEdgesChange);
  const onConnect = useFlowStore((s) => s.actions.edges.onConnect);
  const deleteNode = useFlowStore((s) => s.actions.nodes.deleteNode);
  const deleteEdge = useFlowStore((s) => s.actions.edges.deleteEdge);

  const { getNodes } = useReactFlow();

  const deleteKeyCode = useDeleteKeyCode();
  const [onDragOver, onDrop] = useDragDropFlowBuilder();

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filteredChanges = changes.map((change) => {
        if (change.type === "select") {
          const node = nodes.find((n) => n.id === change.id);
          if (
            node &&
            (node.type === BuilderNode.START || node.type === BuilderNode.END)
          ) {
            return { ...change, selected: false };
          }
        }
        return change;
      });

      onNodesChange(filteredChanges);
    },
    [onNodesChange, nodes]
  );

  const handleDeleteElements = useCallback(() => {
    const selectedNodes = nodes.filter(
      (node) =>
        node.selected &&
        node.type !== BuilderNode.START &&
        node.type !== BuilderNode.END
    );
    const selectedEdges = edges.filter((edge) => edge.selected);

    selectedNodes.forEach((node) => deleteNode(node));
    selectedEdges.forEach((edge) => deleteEdge(edge));
  }, [nodes, edges, deleteNode, deleteEdge]);

  return (
    <>
      <div className="h-14 border-b border-card-foreground/10 from-primary/40 p-2 to-transparent bg-gradient-to-r w-full  items-center flex justify-between">
        <div className="inline-flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <Icon
              icon="ion:arrow-back-outline"
              className="size-6"
            />
          </Button>
          <h1 className="font-bold">{name || "Workflow"}</h1>
        </div>

        {name !== "" && (
          <div className="inline-flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Icon icon="material-symbols:save" className="size-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>
      <div className="relative w-full h-[calc(100vh-3.5rem)]">
        <ReactFlow
          proOptions={{ hideAttribution: true }}
          onInit={({ fitView }) => fitView().then()}
          nodeTypes={NODE_TYPES}
          nodes={nodes}
          onNodesChange={handleNodesChange}
          edgeTypes={edgeTypes}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodesDelete={handleDeleteElements}
          selectionMode={SelectionMode.Full}
          multiSelectionKeyCode="Control"
          selectionOnDrag={true}
          selectionKeyCode={null}
          deleteKeyCode={deleteKeyCode}
          snapGrid={[16, 16]}
          snapToGrid
          fitView
        >
          <Background gap={24} />
          <Controls />
        </ReactFlow>
      </div>
    </>
  );
};
