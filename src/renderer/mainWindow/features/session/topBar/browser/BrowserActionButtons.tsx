import {Button} from '@heroui/react';
import useHotkeyPress from '@lynx/hooks/hotkeys';
import {useIsActiveTab} from '@lynx/layouts/tabs/utils';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {Hotkey_Names} from '@lynx_common/consts/hotkeys';
import browserIpc from '@lynx_shared/ipc/browser';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {Home2Icon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {ArrowLeftIcon, ArrowRightIcon} from '@solar-icons/react/line-duotone';
import {AnimatePresence, motion, Transition, Variants} from 'framer-motion';
import {X} from 'lucide-react';
import {memo, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import LynxTooltip from '../../../../components/LynxTooltip';
import {triggerActions} from '../../../../redux/reducers/triggers';
import {AppDispatch} from '../../../../redux/store';

const variants: Variants = {
  animate: {scale: 1, opacity: 1},
  exit: {scale: 0.7, opacity: 0},
};

const transition: Transition = {duration: 0.3};

type Props = {
  /**
   * The web UI address (home page).
   */
  webuiAddress: string;
  /**
   * The ID of the tab.
   */
  tabID: string;
  /**
   * The ID of the browser/card.
   */
  id: string;
  /**
   * Whether the DOM is ready.
   */
  isDomReady: boolean;
};

/**
 * Browser navigation buttons (Back, Forward, Reload/Stop, Home).
 */
const BrowserActionButtons = memo(({webuiAddress, tabID, id, isDomReady}: Props) => {
  const isActiveTab = useIsActiveTab(tabID);
  const tabs = useTabsState('tabs');
  const dispatch = useDispatch<AppDispatch>();

  const [canGoBack, setCanGoBack] = useState<boolean>(false);
  const [canGoForward, setCanGoForward] = useState<boolean>(false);

  const isLoading = useMemo(() => tabs.find(tab => tab.id === tabID)?.isLoading ?? false, [tabs, tabID]);

  const goBack = () => {
    browserIpc.send.goBack(id);
  };
  const goForward = () => {
    browserIpc.send.goForward(id);
  };
  const reload = () => {
    browserIpc.send.reload(id);
    dispatch(triggerActions.trigger('reloadBrowserHomePage'));
  };
  const stop = () => {
    browserIpc.send.stop(id);
  };
  const loadWebuiURL = () => {
    browserIpc.send.loadURL(id, webuiAddress);
  };
  const toggleDevTools = () => {
    AddBreadcrumb_Renderer('Browser: Toggle Developer Tools');
    browserIpc.send.toggleDevTools(id);
  };

  const canToggleDevTools = isActiveTab && isDomReady;

  useHotkeyPress([
    {name: Hotkey_Names.refreshTab, method: isActiveTab ? reload : null},
    {name: Hotkey_Names.toggleDevTools, method: canToggleDevTools ? toggleDevTools : null},
  ]);

  useEffect(() => {
    const offCanGo = browserIpc.on.canGoBackForward((targetID, canGo) => {
      if (targetID == id) {
        setCanGoBack(canGo.back);
        setCanGoForward(canGo.forward);
      }
    });
    return () => offCanGo();
  }, [id]);

  return (
    <div className="flex flex-row gap-x-1 ml-1">
      <AnimatePresence>
        {canGoBack && (
          <motion.div exit="exit" initial="exit" animate="animate" variants={variants} transition={transition}>
            <LynxTooltip delay={1000} content="Click to go back">
              <Button size="sm" variant="ghost" onPress={goBack} aria-label="Go Back" isIconOnly>
                <ArrowLeftIcon className="size-4" />
              </Button>
            </LynxTooltip>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {canGoForward && (
          <motion.div exit="exit" initial="exit" animate="animate" variants={variants} transition={transition}>
            <LynxTooltip delay={1000} content="Click to go forward">
              <Button size="sm" variant="ghost" onPress={goForward} aria-label="Go Forward" isIconOnly>
                <ArrowRightIcon className="size-4" />
              </Button>
            </LynxTooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <LynxTooltip delay={1000} content="Stop loading">
          <Button size="sm" onPress={stop} variant="ghost" aria-label="Stop Loading" isIconOnly>
            <X className="size-4" />
          </Button>
        </LynxTooltip>
      ) : (
        <LynxTooltip delay={1000} content="Reload page">
          <Button size="sm" variant="ghost" onPress={reload} aria-label="Reload Page" isIconOnly>
            <RestartIcon className="size-4" />
          </Button>
        </LynxTooltip>
      )}

      {webuiAddress && (
        <LynxTooltip delay={1000} content="Go to Home">
          <Button size="sm" variant="ghost" aria-label="Go Home" onPress={loadWebuiURL} isIconOnly>
            <Home2Icon className="size-4" />
          </Button>
        </LynxTooltip>
      )}
    </div>
  );
});

BrowserActionButtons.displayName = 'BrowserActionButtons';

export default BrowserActionButtons;
