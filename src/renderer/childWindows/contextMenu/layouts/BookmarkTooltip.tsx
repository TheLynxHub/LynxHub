import bookmarkTooltipIpc from '@lynx_shared/ipc/bookmarkTooltip';
import {useLayoutEffect, useRef} from 'react';

import {useContextState} from '../redux/reducer';

/**
 * BookmarkTooltip layout component.
 * Displays a rich tooltip preview when hovering over bookmarks in the bookmarks bar.
 */
export default function BookmarkTooltip() {
  const data = useContextState('bookmarkTooltip');
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current && data) {
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.min(Math.max(Math.ceil(rect.width) + 8, 120), 500);
      const height = Math.min(Math.max(Math.ceil(rect.height) + 6, 24), 100);
      bookmarkTooltipIpc.send.resizeTooltip(width, height);
    }
  }, [data]);

  if (!data || (!data.title && !data.url)) return null;

  return (
    <div
      className={
        'inline-flex flex-col gap-0.5 px-3 py-1.5 rounded-xl ' +
        'bg-surface/95 border border-border ' +
        'text-foreground backdrop-blur-md shadow-2xl overflow-hidden'
      }
      ref={containerRef}
      style={{maxWidth: '480px'}}>
      {data.title && <div className="text-xs font-semibold truncate leading-tight">{data.title}</div>}
      {data.url && <div className="text-[11px] text-muted font-JetBrainsMono truncate leading-tight">{data.url}</div>}
    </div>
  );
}
