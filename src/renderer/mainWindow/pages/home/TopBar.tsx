import {Button} from '@heroui/react';
import {cardsActions} from '@lynx/redux/reducers/cards';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {Terminal_Icon} from '@lynx_assets/icons';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {EarthIcon} from '@solar-icons/react/bold-duotone';
import {motion, useReducedMotion, Variants} from 'framer-motion';
import {Plus} from 'lucide-react';
import {useMemo} from 'react';
import {useDispatch} from 'react-redux';

/**
 * Animated top bar component for the Home page.
 * Provides quick actions to open new terminals, browsers, or split views.
 */
export default function HomeTopBar() {
  const activeTab = useTabsState('activeTab');
  const dispatch = useDispatch<AppDispatch>();
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = useMemo(
    () => ({
      hidden: {opacity: 0, y: shouldReduceMotion ? 0 : -6},
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: shouldReduceMotion ? 0.1 : 0.18,
          ease: [0.23, 1, 0.32, 1] as const,
          staggerChildren: shouldReduceMotion ? 0 : 0.04,
        },
      },
    }),
    [shouldReduceMotion],
  );

  const itemVariants: Variants = useMemo(
    () => ({
      hidden: {opacity: 0, y: shouldReduceMotion ? 0 : -4},
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: shouldReduceMotion ? 0.1 : 0.16,
          ease: [0.23, 1, 0.32, 1] as const,
        },
      },
    }),
    [shouldReduceMotion],
  );

  /**
   * Dispatches an action to open a new empty card of the specified type in the active tab.
   *
   * @param {'browser' | 'terminal' | 'both'} type The type of view to open.
   */
  const addRunningEmpty = (type: 'browser' | 'terminal' | 'both') =>
    dispatch(
      cardsActions.addRunningEmpty({
        tabId: activeTab,
        type,
      }),
    );

  const handleNewTerminal = () => {
    AddBreadcrumb_Renderer(`New Empty Terminal`);
    addRunningEmpty('terminal');
  };

  const handleNewBrowser = () => {
    AddBreadcrumb_Renderer(`New Empty Browser`);
    addRunningEmpty('browser');
  };

  const handleNewTerminalBrowser = () => {
    AddBreadcrumb_Renderer(`New Empty Terminal & Browser`);
    addRunningEmpty('both');
  };

  return (
    <div className="flex w-full shrink-0 flex-row items-center justify-end gap-x-3 px-6 py-3">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="flex items-center gap-3">
        <motion.div variants={itemVariants}>
          <Button size="sm" className="w-25" variant="tertiary" onPress={handleNewTerminal}>
            <Terminal_Icon />
            Terminal
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button size="sm" className="w-25" variant="tertiary" onPress={handleNewBrowser}>
            <EarthIcon />
            Browser
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button size="sm" className="w-21" onPress={handleNewTerminalBrowser}>
            <Terminal_Icon className="flex-1" />
            <Plus className="size-2.5 opacity-80" />
            <EarthIcon className="flex-1" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
