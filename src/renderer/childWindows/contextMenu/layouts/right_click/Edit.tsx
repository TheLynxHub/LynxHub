import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {
  ClipboardTextIcon,
  CopyIcon,
  ScissorsIcon,
  TextSelectionIcon,
  UndoLeftRoundIcon,
} from '@solar-icons/react/bold-duotone';
import type {EditFlags} from 'electron';
import {isEmpty} from 'lodash-es';
import {memo, useCallback} from 'react';

import Separator from './Separator';
import {ActionButton, createActionHandler} from './Utils';

type EditProps = {
  /** Edit flags provided by Electron */
  flags: EditFlags;
  /** The currently selected text */
  selection: string;
  /** The ID of the target window/contents */
  id: number;
};

/**
 * Edit component renders standard edit actions (Undo, Redo, Cut, Copy, Paste, Select All)
 * based on the provided flags and selection.
 */
export const Edit = memo(({flags, selection, id}: EditProps) => {
  const {canUndo, canCut, canRedo, canPaste, canSelectAll, canCopy} = flags;

  // Handlers
  const onUndo = useCallback(() => createActionHandler(() => contextMenuIpc.send.rightClickItems.undo(id)), [id]);
  const onRedo = useCallback(() => createActionHandler(() => contextMenuIpc.send.rightClickItems.redo(id)), [id]);
  const onCut = useCallback(() => createActionHandler(() => contextMenuIpc.send.rightClickItems.cut(id)), [id]);
  const onCopy = useCallback(() => createActionHandler(() => contextMenuIpc.send.rightClickItems.copy(id)), [id]);
  const onPaste = useCallback(() => createActionHandler(() => contextMenuIpc.send.rightClickItems.paste(id)), [id]);
  const onSelectAll = useCallback(
    () => createActionHandler(() => contextMenuIpc.send.rightClickItems.selectAll(id)),
    [id],
  );

  return (
    <>
      {canUndo && (
        <ActionButton
          title="Undo"
          onPress={onUndo()}
          key="context_undo"
          icon={<UndoLeftRoundIcon className="size-4" />}
        />
      )}
      {canRedo && (
        <ActionButton
          title="Redo"
          onPress={onRedo()}
          key="context_redo"
          icon={<UndoLeftRoundIcon className="size-4 scale-x-[-1]" />}
        />
      )}
      {canCut && !isEmpty(selection) && (
        <ActionButton title="Cut" onPress={onCut()} key="context_cut" icon={<ScissorsIcon className="size-4" />} />
      )}
      {canCopy && !isEmpty(selection) && (
        <ActionButton title="Copy" onPress={onCopy()} key="context_copy" icon={<CopyIcon className="size-4" />} />
      )}
      {canPaste && (
        <ActionButton
          title="Paste"
          onPress={onPaste()}
          key="context_paste"
          icon={<ClipboardTextIcon className="size-4" />}
        />
      )}
      {canSelectAll && (
        <ActionButton
          title="Select All"
          onPress={onSelectAll()}
          key="context_selectAll"
          icon={<TextSelectionIcon className="size-4" />}
        />
      )}
      <Separator />
    </>
  );
});
