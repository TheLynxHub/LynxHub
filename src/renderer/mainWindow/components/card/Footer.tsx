import {Button, CardFooter, UseOverlayStateReturn} from '@heroui/react';
import ShinyText from '@lynx/components/ShinyText';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useAppState} from '@lynx/redux/reducers/app';
import {useInstalledCard, useIsPinnedCard} from '@lynx/utils/hooks';
import filesIpc from '@lynx_shared/ipc/files';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {Pin, Play} from '@solar-icons/react-perf/Bold';
import {DownloadMinimalistic, FolderOpen} from '@solar-icons/react-perf/BoldDuotone';
import {Pin as PinLine} from '@solar-icons/react-perf/LineDuotone';
import {AnimatePresence, motion} from 'framer-motion';
import {memo, useCallback, useMemo} from 'react';

import {useHotkeysState} from '../../redux/reducers/hotkeys';
import InstalledMenu from './menu/Installed';
import UninstalledMenu from './menu/Uninstalled';
import {useCardStore} from './store';
import {useCardOverlayState} from './useCardOverlayState';

const MotionButton = motion.create(Button);

type Props = {
  isRunning: boolean;
  updatingExtensions: boolean;
  updating: boolean;
  updateCount: string;
  id: string;
  setType: (type: 'install' | 'update') => void;
  state: UseOverlayStateReturn;
};

/**
 * Footer component for the Card.
 * Displays actions like Pin, Play, Download, and status text.
 */
const Footer = memo(({isRunning, updatingExtensions, updating, updateCount, id, setType, state}: Props) => {
  const darkMode = useAppState('darkMode');

  const isInstalled = useCardStore(state => state.installed);
  const isOnline = useCardStore(state => state.isOnline);
  const isPinned = useIsPinnedCard(id);

  const isCtrlPressed = useHotkeysState('isCtrlPressed');
  const webUI = useInstalledCard(id);

  const onPress = useCallback(() => {
    AddBreadcrumb_Renderer(`Pin AI: id:${id} , ${isPinned ? 'remove' : 'add'}`);
    storageUtilsIpc.invoke.pinnedCards(isPinned ? 'remove' : 'add', id);
  }, [isPinned, id]);

  const showOpenFolder = useMemo(() => {
    return !!webUI?.dir && isCtrlPressed;
  }, [webUI, isCtrlPressed]);

  const openFolder = () => {
    if (webUI && webUI.dir) filesIpc.openPath(webUI.dir);
  };

  const ReplaceMenu = useMemo(() => extensionsData.cards.customize.menu.replace, []);

  return (
    <CardFooter className="justify-between">
      <div
        onClick={e => e.stopPropagation()}
        onContextMenu={e => e.stopPropagation()}
        className="flex flex-row items-center gap-x-2">
        {!isRunning &&
          !isOnline &&
          (isInstalled ? (
            ReplaceMenu ? (
              <ReplaceMenu useCardStore={useCardStore} useCardOverlayState={useCardOverlayState} />
            ) : (
              <InstalledMenu state={state} setType={setType} />
            )
          ) : (
            <UninstalledMenu />
          ))}
        {(isInstalled || isOnline) && (
          <Button
            className={
              `shrink-0 -translate-x-2 opacity-0 transition duration-200 ` +
              `group-hover:translate-x-0 group-hover:opacity-100`
            }
            size="sm"
            variant="ghost"
            onPress={onPress}
            isIconOnly>
            {isPinned ? <Pin className="size-3" /> : <PinLine className="size-3" />}
          </Button>
        )}
      </div>
      {updating ? (
        <ShinyText speed={2} text="Updating" darkMode={darkMode} className="text-xs font-bold text-success/70" />
      ) : updatingExtensions ? (
        <ShinyText
          speed={2}
          darkMode={darkMode}
          text={`Updating Extensions ${updateCount}`}
          className="text-xs font-bold text-secondary/70"
        />
      ) : isRunning ? (
        <ShinyText speed={2} text="Running" darkMode={darkMode} className="text-xs font-bold text-accent/70" />
      ) : (
        !isOnline && (
          <div
            className={
              'translate-y-2 opacity-0 transition duration-400 group-hover:translate-y-0 group-hover:opacity-100'
            }>
            {isInstalled ? <Play className="size-4 text-accent" /> : <DownloadMinimalistic className="size-4" />}
          </div>
        )
      )}

      <AnimatePresence>
        {showOpenFolder && (
          <MotionButton
            size="sm"
            variant="tertiary"
            onPress={openFolder}
            transition={{type: 'spring', duration: 0.5}}
            exit={{opacity: 0, scale: 0.8, translateY: 10}}
            animate={{opacity: 1, scale: 1, translateY: 0}}
            initial={{opacity: 0, scale: 0.8, translateY: 10}}
            className="absolute bottom-2 right-1/2 translate-x-1/2 duration-0 shrink-0">
            <FolderOpen size={16} className="text-muted" />
          </MotionButton>
        )}
      </AnimatePresence>
    </CardFooter>
  );
});

export default Footer;
