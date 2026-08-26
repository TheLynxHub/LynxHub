import {Skeleton} from '@heroui/react';
import browserIpc from '@lynx_shared/ipc/browser';

import {useElementResizing} from '../../../utils/hooks';

export default function BrowserViewPlaceholder() {
  const containerRef = useElementResizing(browserIpc.send.resizeBrowserView);

  return (
    <div
      aria-busy="true"
      ref={containerRef}
      aria-label="Loading page content"
      className="size-full select-none overflow-hidden bg-white p-6 md:p-10 dark:bg-LynxNearBlack">
      <div className="mx-auto max-w-5xl space-y-6 pt-4">
        {/* Minimal header line */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Hero content block */}
        <Skeleton className="h-56 w-full rounded-2xl md:h-72" />

        {/* Text lines */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-5 w-4/5 rounded-full" />
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-5 w-3/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
