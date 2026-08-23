import {Chip, ScrollShadow} from '@heroui/react';
import type {QuickWebItem} from '@lynx_common/types/storage';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import quickWebIpc from '@lynx_shared/ipc/quickWeb';
import {BoltIcon, CheckCircleIcon, EarthIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback} from 'react';

import {useContextState} from '../redux/reducer';

/**
 * Layout for the Quick Web Switcher in the Context Menu overlay.
 * Floats cleanly above all WebContentsViews and allows selecting quick websites.
 */
const QuickWebSwitcher = memo(function QuickWebSwitcher() {
  const payload = useContextState('quickWebSwitcher');
  const items = payload?.items || [];
  const activeItemId = payload?.activeItemId;

  const handleSelectItem = useCallback((item: QuickWebItem) => {
    contextMenuIpc.send.hideWindow();
    quickWebIpc.send.selectItem(item.id);
  }, []);

  return (
    <div className="w-80 p-1 flex flex-col gap-y-1 select-none font-sans text-foreground">
      <div className="px-2 py-1.5 flex items-center justify-between border-b border-surface-tertiary">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Quick Websites</span>
        <Chip size="sm" variant="secondary" className="text-[10px] h-5 px-1.5">
          {items.length} saved
        </Chip>
      </div>

      <ScrollShadow className="max-h-72 flex flex-col gap-y-0.5 p-0.5">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted">
            No quick websites configured yet. Add websites in LynxHub Settings &rarr; Quick Web.
          </div>
        ) : (
          items.map(item => {
            const isSelected = item.id === activeItemId;
            return (
              <div
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectItem(item);
                  }
                }}
                className={
                  'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-100 ' +
                  (isSelected
                    ? 'bg-surface-tertiary text-foreground font-semibold'
                    : 'hover:bg-surface-secondary text-foreground/90')
                }
                tabIndex={0}
                key={item.id}
                role="button"
                onClick={() => handleSelectItem(item)}>
                <div className="flex items-center gap-x-2.5 min-w-0 flex-1">
                  {item.favIcon ? (
                    <img
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      alt=""
                      src={item.favIcon}
                      className="size-4 rounded-xs shrink-0 object-contain"
                    />
                  ) : (
                    <EarthIcon className="size-4 shrink-0 text-muted" />
                  )}

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs truncate">{item.title || item.url}</span>
                    <span className="text-[10px] text-muted font-JetBrainsMono truncate">{item.url}</span>
                  </div>
                </div>

                <div className="flex items-center gap-x-1.5 shrink-0 pl-1.5">
                  {item.preload && (
                    <Chip size="sm" variant="soft" color="warning" className="gap-x-0.5 text-[10px] px-1 py-0 h-4">
                      <BoltIcon className="size-2.5 text-warning" />
                      Preload
                    </Chip>
                  )}

                  {isSelected && <CheckCircleIcon className="size-3.5 text-success shrink-0" />}
                </div>
              </div>
            );
          })
        )}
      </ScrollShadow>
    </div>
  );
});

export default QuickWebSwitcher;
