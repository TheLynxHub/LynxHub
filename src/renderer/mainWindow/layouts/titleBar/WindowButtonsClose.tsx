import {useHotkeysState} from '@lynx/redux/reducers/hotkeys';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {Power_Icon} from '@lynx_assets/icons';
import applicationIpc from '@lynx_shared/ipc/application';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import storageIpc from '@lynx_shared/ipc/storage';
import {HTMLMotionProps, motion} from 'framer-motion';
import {memo, useCallback} from 'react';

type Props = {
  buttonProps: HTMLMotionProps<'button'>;
  commonStyles: string;
};

/**
 * Close button for the window title bar.
 * Handles close confirmation logic and saving state.
 */
const WindowButtonsClose = memo(({buttonProps, commonStyles}: Props) => {
  const isCtrlPressed = useHotkeysState('isCtrlPressed');
  const activePage = useTabsState('activePage');
  const showCloseConfirm = useSettingsState('closeConfirm');

  const close = useCallback(() => applicationIpc.send.changeWinState('close'), []);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      storageIpc.update('app', {lastPage: activePage});
      if (isCtrlPressed || !showCloseConfirm) {
        close();
      } else {
        contextMenuIpc.send.openCloseApp({x: e.clientX, y: e.clientY});
      }
    },
    [activePage, isCtrlPressed, showCloseConfirm, close],
  );

  return (
    <motion.button
      {...buttonProps}
      type="button"
      onClick={onClick}
      className={`${commonStyles} pl-3 pr-4 hover:bg-danger`}>
      <Power_Icon className="size-[0.8rem]" />
    </motion.button>
  );
});

export default WindowButtonsClose;
