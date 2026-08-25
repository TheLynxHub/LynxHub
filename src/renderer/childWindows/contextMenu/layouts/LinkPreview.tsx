import browserIpc from '@lynx_shared/ipc/browser';
import {useLayoutEffect, useRef} from 'react';

import {useContextState} from '../redux/reducer';

/**
 * LinkPreview layout component.
 * Displays a preview tooltip when hovering over links in browser tabs.
 */
export default function LinkPreview() {
  const url = useContextState('linkPreviewUrl');
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current && url) {
      const width = Math.min(containerRef.current.scrollWidth + 20, 800);
      browserIpc.send.resizeLinkPreview(width);
    }
  }, [url]);

  if (!url) return null;

  return (
    <div
      className={
        'inline-flex items-center px-2.5 py-0.5 text-xs truncate rounded-xl bg-surface/95 ' +
        'border border-border text-foreground backdrop-blur-md whitespace-nowrap shadow-xl'
      }
      ref={containerRef}
      style={{maxWidth: '800px'}}>
      {url}
    </div>
  );
}
