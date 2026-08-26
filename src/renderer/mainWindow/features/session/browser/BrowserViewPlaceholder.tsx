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
      className="size-full select-none overflow-hidden bg-white p-6 dark:bg-LynxNearBlack">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top simulated navbar */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>

        {/* Hero header */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-7 w-3/5 rounded-lg" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border/40 bg-surface/50 p-4 shadow-xs">
              <Skeleton className="h-28 w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-4/5 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
