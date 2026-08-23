import {Button} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import filesIpc from '@lynx_shared/ipc/files';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {FileTextIcon} from '@solar-icons/react/bold-duotone';
import {SerializeAddon} from '@xterm/addon-serialize';
import {memo, useCallback} from 'react';

import CopyClipboard from '../../../../components/CopyClipboard';
import LynxTooltip from '../../../../components/LynxTooltip';

type Props = {
  /**
   * The serialize addon for xterm.js.
   */
  serializeAddon: SerializeAddon;
};

/**
 * Buttons to copy terminal content to clipboard or save to file.
 */
const TerminalCopyAll = memo(({serializeAddon}: Props) => {
  const handleCopy = useCallback(async () => {
    let contentToCopy: string;
    try {
      contentToCopy = serializeAddon.serialize();
    } catch {
      topToast.warning('Terminal is not ready or content cannot be copied.');
      return;
    }
    if (!contentToCopy) return;

    try {
      AddBreadcrumb_Renderer('Terminal: Copy all to clipboard');
      await navigator.clipboard.writeText(contentToCopy);
    } catch {
      topToast.danger('Failed to copy terminal text to clipboard!');
    }
  }, [serializeAddon]);

  const saveFile = useCallback(() => {
    let contentToSave: string;
    try {
      contentToSave = serializeAddon.serialize();
    } catch {
      topToast.warning('Terminal is not ready or content cannot be saved.');
      return;
    }
    if (!contentToSave) {
      topToast.warning('Failed get terminal text to save!');
      return;
    }

    AddBreadcrumb_Renderer('Terminal: Export all to file');
    filesIpc
      .saveToFile(contentToSave, 'terminal-export.txt')
      .then(result => {
        if (result) topToast.success('Successfully saved terminal data.');
      })
      .catch(() => topToast.danger('Failed to save terminal text to file!'));
  }, [serializeAddon]);

  return (
    <div className="flex flex-row items-center gap-x-1">
      <CopyClipboard onCopy={handleCopy} tooltipTitle="Copy all to clipboard" />

      <LynxTooltip delay={500} content="Export all to file">
        <Button size="sm" variant="ghost" onPress={saveFile} aria-label="Export all to file" isIconOnly>
          <FileTextIcon className="size-3.5" />
        </Button>
      </LynxTooltip>
    </div>
  );
});

TerminalCopyAll.displayName = 'TerminalCopyAll';

export default TerminalCopyAll;
