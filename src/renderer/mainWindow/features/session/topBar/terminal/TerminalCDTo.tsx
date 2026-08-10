import {Button, CloseButton, Header, Popover, ScrollShadow, Separator} from '@heroui/react';
import {terminalLineEnding} from '@lynx_common/utils';
import filesIpc from '@lynx_shared/ipc/files';
import ptyIpc from '@lynx_shared/ipc/pty';
import storageIpc from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {BroomIcon, FolderOpenIcon, MoveToFolderIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {memo, useCallback, useEffect, useState} from 'react';

import LynxTooltip from '../../../../components/LynxTooltip';
import {topToast} from '../../../../layouts/ToastProviders';

type Props = {
  /**
   * The ID of the terminal/card.
   */
  id: string;
};

/**
 * A button to change the terminal directory (cd).
 */
const TerminalCDTo = memo(({id}: Props) => {
  const [history, setHistory] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const cdTo = useCallback(
    (dir: string) => {
      setIsOpen(false);
      const newHistory = [dir, ...history.filter(item => item !== dir)];

      storageIpc.update('terminal', {cdHistory: newHistory});
      setHistory(newHistory);

      AddBreadcrumb_Renderer('Terminal: CD to directory');
      ptyIpc.write(id, `cd "${dir}"${terminalLineEnding}`);
    },
    [history, id],
  );

  const removeFromHistory = useCallback(
    (dir: string) => {
      const newHistory = history.filter(item => item !== dir);

      storageIpc.update('terminal', {cdHistory: newHistory});
      setHistory(newHistory);
      AddBreadcrumb_Renderer('Terminal: Remove item from CD history');
    },
    [history],
  );

  const clearHistory = useCallback(() => {
    storageIpc.update('terminal', {cdHistory: []});
    setHistory([]);
    AddBreadcrumb_Renderer('Terminal: Clear CD history');
  }, []);

  const selectDir = useCallback(() => {
    setIsOpen(false);
    AddBreadcrumb_Renderer('Terminal: Choose CD directory dialog');
    filesIpc
      .openDlg({properties: ['openDirectory']})
      .then(dir => {
        if (dir) {
          cdTo(dir);
        } else {
          topToast.warning('No directory selected');
        }
      })
      .catch(e => {
        console.error(e);
        topToast.danger('Error opening directory');
      });
  }, [id, cdTo]);

  useEffect(() => {
    storageIpc.get('terminal').then(({cdHistory}) => {
      if (!isEmpty(cdHistory)) setHistory(cdHistory);
    });
  }, []);

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <LynxTooltip delay={500} content="Change terminal directory (cd)">
          <Button size="sm" variant="ghost" aria-label="Change Directory" isIconOnly>
            <MoveToFolderIcon className="size-3.5" />
          </Button>
        </LynxTooltip>
      </Popover.Trigger>
      <Popover.Content placement="bottom start">
        <Popover.Dialog className="w-[320px] py-3">
          <Popover.Heading className="flex items-center justify-between mb-2">
            <Header>Change Directory</Header>
            {!isEmpty(history) && (
              <Button size="sm" variant="ghost" onPress={clearHistory} className="text-danger shrink-0" isIconOnly>
                <BroomIcon className="size-3" />
              </Button>
            )}
          </Popover.Heading>
          {/* Choose folder button */}
          <Button variant="ghost" onPress={selectDir} className="justify-start" fullWidth>
            <FolderOpenIcon className="size-3.5" />
            Choose folder…
          </Button>

          <Separator className="my-2" />

          {/* History list */}
          {isEmpty(history) ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center">
              <MoveToFolderIcon className="size-6 text-muted" />
              <p className="text-xs text-muted">No recent directories</p>
            </div>
          ) : (
            <ScrollShadow className="max-h-50 flex flex-col">
              {history.map(item => (
                <Button key={item} variant="ghost" className="group" onPress={() => cdTo(item)} fullWidth>
                  <MoveToFolderIcon className="size-3.5 shrink-0 text-muted" />
                  <div className={'min-w-0 flex-1 truncate text-left text-xs text-semi-muted hover:text-foreground'}>
                    {item}
                  </div>
                  <CloseButton
                    onPress={() => removeFromHistory(item)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 duration-200"
                  />
                </Button>
              ))}
            </ScrollShadow>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
});

TerminalCDTo.displayName = 'TerminalCDTo';

export default TerminalCDTo;
