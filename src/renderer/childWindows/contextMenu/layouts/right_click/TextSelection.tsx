import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {MagnifierIcon} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import Separator from './Separator';
import {ActionButton, createActionHandler} from './Utils';

type TextSelectionProps = {
  /** The currently selected text */
  selection: string;
};

/**
 * Component that renders context menu actions for selected text.
 * Currently allows searching the selection with Google.
 */
const TextSelection = memo(function TextSelection({selection}: TextSelectionProps) {
  if (!selection) return null;

  return (
    <>
      <ActionButton
        onPress={createActionHandler(() => {
          contextMenuIpc.send.rightClickItems.searchWithGoogle(selection);
        })}
        title={`Search with Google`}
        icon={<MagnifierIcon className="size-4" />}
      />
      <Separator />
    </>
  );
});

export default TextSelection;
