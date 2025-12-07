import { type Node, type NodeProps, Position } from "@xyflow/react";
import { nanoid } from "nanoid";
import { memo, useCallback, useMemo, useState } from "react";
import { BaseNodeData, BuilderNode, RegisterNodeMetadata } from "../types";
import { getNodeDetail } from "../utils";
import { useFlowStore } from "@/stores/flow-store";
import CustomHandle from "@/components/flow-builder/components/handles/custom-handler";
import {
  NodeCard,
  NodeCardContent,
  NodeCardDescription,
  NodeCardFooter,
  NodeCardHeader,
} from "../../ui/node-card";
import { Badge } from "@/shared/components/ui/badge";

const NODE_TYPE = BuilderNode.TAGS;

export interface TagsNodeData extends BaseNodeData {
  tags: string[];
}

const badgeStyle = (color: string) => ({
  borderColor: `${color}20`,
  backgroundColor: `${color}30`,
  color,
});

type TagsNodeProps = NodeProps<Node<TagsNodeData, typeof NODE_TYPE>>;

export function TagsNode({ id, isConnectable, selected, data }: TagsNodeProps) {
  const meta = useMemo(() => getNodeDetail(NODE_TYPE), []);

  const showNodePropertiesOf = useFlowStore(
    (s) => s.actions.sidebar.showNodePropertiesOf
  );
  const tags = useFlowStore((s) => s.tags);
  const deleteNode = useFlowStore((s) => s.actions.nodes.deleteNode);
  const nodes = useFlowStore((s) => s.workflow.nodes);

  const [sourceHandleId] = useState<string>(nanoid());

  const handleDeleteNode = () => {
    const node = nodes.find((n) => n.id === id);
    if (node) deleteNode(node);
  };

  const handleShowNodeProperties = useCallback(() => {
    showNodePropertiesOf({ id, type: NODE_TYPE });
  }, [id, showNodePropertiesOf]);

  return (
    <NodeCard data-selected={selected} onDoubleClick={handleShowNodeProperties}>
      <NodeCardHeader
        icon={meta.icon}
        title={meta.title}
        handleDeleteNode={handleDeleteNode}
        handleShowNodeProperties={handleShowNodeProperties}
        gradientColor={meta.gradientColor}
      />

      <NodeCardContent>
        <div className="flex flex-col p-4">
          <div className="text-xs font-medium text-card-foreground">
            Tags added
          </div>

          <div className="line-clamp-1 flex gap-2 flex-wrap mt-2 text-sm leading-snug">
            {!data.tags || data.tags.length === 0 ? (
              <span className="text-card-foreground italic">
                No tags added...
              </span>
            ) : (
              data.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  style={badgeStyle(
                    tags.find(({ value }) => value === tag)?.color || "#cecece"
                  )}
                  className="mb-1 mr-1"
                >
                  {tags.find(({ value }) => value === tag)?.label || tag}
                </Badge>
              ))
            )}
          </div>
        </div>

        <NodeCardDescription description="Add tags" />

        <NodeCardFooter nodeId={id} />
      </NodeCardContent>
      <CustomHandle
        type="target"
        id={sourceHandleId}
        position={Position.Left}
        isConnectable={isConnectable}
      />

      <CustomHandle
        type="source"
        id={sourceHandleId}
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </NodeCard>
  );
}

export const metadata: RegisterNodeMetadata<TagsNodeData> = {
  type: NODE_TYPE,
  node: memo(TagsNode),
  detail: {
    icon: "tabler:tags-filled",
    title: "Tags",
    description: "Add tags to the workflow",
    gradientColor: "pink",
  },
  connection: {
    inputs: 1,
    outputs: 1,
  },
  defaultData: {
    tags: ["marketing", "new"],
  },
};
