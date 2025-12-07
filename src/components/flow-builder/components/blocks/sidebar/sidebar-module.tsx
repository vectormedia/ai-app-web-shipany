import { useFlowStore } from "@/stores/flow-store";
import { DesktopSidebarFragment } from "./fragments/desktop-sidebar-fragment";

export function SidebarModule() {
  const activePanel = useFlowStore((s) => s.workflow.sidebar.active);
  const setActivePanel = useFlowStore((s) => s.actions.sidebar.setActivePanel);

  return (
    <DesktopSidebarFragment
      activePanel={activePanel}
      setActivePanel={setActivePanel}
    />
  );
}
