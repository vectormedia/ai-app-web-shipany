'use client';

import { useEffect, useState } from 'react';

export function ElectronDragRegion() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(!!(window as any).electronAPI?.isElectron);
  }, []);

  if (!isElectron) {
    return null;
  }

  return (
    <div className="electron-drag fixed top-0 left-0 right-0 h-8 z-[9999]" />
  );
}
