import {useAppState} from '@lynx/redux/reducers/app';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {AltArrowDownIcon, AltArrowUpIcon} from '@solar-icons/react/linear';
import {AnimatePresence, motion, Transition} from 'framer-motion';
import {memo, MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState, WheelEvent} from 'react';
import {useDispatch} from 'react-redux';

import Tooltip from './Tooltip';

export type NavItem = {
  title: string;
  icon: ReactNode;
  badge?: ReactNode | boolean;
  path: string;
};

type Props = {
  items: NavItem[];
  tabId?: string;
  pageID?: string;
};

const springTransition: Transition = {type: 'spring', stiffness: 400, damping: 40};
const springTransitionFast: Transition = {type: 'spring', stiffness: 400, damping: 25};
const springTransitionSnappy: Transition = {type: 'spring', stiffness: 500, damping: 30};
const fadeTransition: Transition = {duration: 0.2};
const scaleTransition: Transition = {duration: 0.3};

const ScrollArrow = memo(
  ({direction, onClick, isDark}: {direction: 'up' | 'down'; onClick: () => void; isDark: boolean}) => {
    const mutedText = isDark ? '#9ca3af' : '#6b7280';
    const hoverBg = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    return (
      <motion.button
        onClick={onClick}
        style={{color: mutedText}}
        whileHover={{backgroundColor: hoverBg, color: isDark ? '#e5e7eb' : '#1f2937'}}
        className="flex items-center justify-center w-full py-2 rounded-xl cursor-pointer pointer-events-auto">
        {direction === 'up' ? <AltArrowUpIcon /> : <AltArrowDownIcon />}
      </motion.button>
    );
  },
);

type ItemProp = {item: NavItem; activePage: string; isDark: boolean; tabID?: string};

const RenderItem = memo(function RenderItem({item, activePage, isDark, tabID = 'dock'}: ItemProp) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const dispatch = useDispatch<AppDispatch>();

  const isActive = useMemo(() => activePage === item.path, [activePage, item.path]);

  const handleClick = useCallback(() => {
    if (isActive) return;

    const {title, path} = item;

    dispatch(
      tabsActions.setActivePage({
        pageID: path,
        title: title || '',
        isTerminal: false,
      }),
    );
  }, [item, isActive, dispatch]);

  const textColor = isDark ? '#e5e7eb' : '#1f2937';
  const mutedText = isDark ? '#9ca3af' : '#6b7280';

  return (
    <Tooltip isDark={isDark} content={item.title}>
      <motion.button
        onClick={handleClick}
        whileTap={{scale: 0.95}}
        className="relative group"
        key={`${tabID}_${item.path}_btn`}
        onHoverEnd={() => setIsHovered(false)}
        onHoverStart={() => setIsHovered(true)}>
        {/* Active indicator */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={false}
              layoutId={`${tabID}_indicator`}
              transition={springTransitionSnappy}
              className="absolute inset-0 rounded-2xl shadow-lg bg-accent"
            />
          )}
        </AnimatePresence>

        {/* Icon container */}
        <motion.div
          style={{
            color: isActive ? '#ffffff' : mutedText,
          }}
          animate={{
            scale: isHovered ? 1.15 : 1,
            y: isHovered ? -2 : 0,
          }}
          whileHover={{color: textColor}}
          transition={springTransitionFast}
          className="relative flex items-center justify-center size-12 rounded-xl">
          {/* Hover background glow */}
          <AnimatePresence>
            {isHovered && activePage !== item.path && (
              <motion.div
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                }}
                transition={fadeTransition}
                exit={{opacity: 0, scale: 0.8}}
                animate={{opacity: 1, scale: 0.9}}
                initial={{opacity: 0, scale: 0.8}}
                className="absolute inset-0 rounded-2xl"
              />
            )}
          </AnimatePresence>

          <motion.div
            animate={{
              scale: isHovered ? [1, 1.1, 1] : 1,
            }}
            className="size-5"
            transition={scaleTransition}>
            {item.icon}
          </motion.div>

          {/* Badge */}
          {item.badge && (
            <motion.div
              initial={{scale: 0}}
              animate={{scale: 1}}
              className={`absolute ${typeof item.badge === 'boolean' ? 'top-1 right-1' : 'top-0 right-0'}`}>
              {typeof item.badge === 'boolean' ? (
                <div className="size-2 bg-success rounded-full" />
              ) : (
                <div
                  className={
                    'px-1.5 py-0.5 bg-success text-white text-xs font-bold rounded-full' +
                    ' min-w-5 flex items-center justify-center'
                  }>
                  {item.badge}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.button>
    </Tooltip>
  );
});

/**
 * NavigationDock component that displays a list of navigation items.
 * Handles responsive layout, scrolling, and hover effects.
 */
const NavigationDock = memo(({items, tabId = 'dock', pageID: propPageID}: Props) => {
  const isDark = useAppState('darkMode');
  const reduxActivePage = useTabsState('activePage');
  const pageID = propPageID ?? reduxActivePage;

  const [mousePosition, setMousePosition] = useState({x: 0, y: 0});
  const [isHoveringDock, setIsHoveringDock] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  const [startIndex, setStartIndex] = useState(0);
  const lastScrollTime = useRef(0);

  // Responsive maxItems based on screen height
  const [maxItems, setMaxItems] = useState(7);

  useEffect(() => {
    const updateMaxItems = () => {
      const height = window.innerHeight;
      // sm: < 640px -> 6 items
      // md: 640-768px -> 7 items
      // lg: 768-1024px -> 9 items
      // xl: 1024-1280px -> 11 items
      // 2xl: >= 1280px -> 13 items
      if (height < 640) {
        setMaxItems(6);
      } else if (height < 768) {
        setMaxItems(7);
      } else if (height < 1024) {
        setMaxItems(9);
      } else if (height < 1280) {
        setMaxItems(11);
      } else {
        setMaxItems(13);
      }
    };

    updateMaxItems();
    window.addEventListener('resize', updateMaxItems);
    return () => window.removeEventListener('resize', updateMaxItems);
  }, []);

  const primaryColor = isDark ? '#0050EF' : '#00A9FF';

  const totalItems = items.length;
  const showScrollControls = maxItems && totalItems > maxItems;
  const canScrollUp = startIndex > 0;
  const canScrollDown = startIndex + maxItems < totalItems;

  const ITEM_HEIGHT = 48;
  const GAP = 2;
  const ITEM_TOTAL_HEIGHT = ITEM_HEIGHT + GAP;

  const handleScrollUp = useCallback(() => {
    setStartIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleScrollDown = useCallback(() => {
    setStartIndex(prev => Math.min(totalItems - maxItems, prev + 1));
  }, [totalItems, maxItems]);

  const handleWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      if (!showScrollControls) return;

      const now = Date.now();
      if (now - lastScrollTime.current < 150) {
        return;
      }
      lastScrollTime.current = now;

      if (e.deltaY > 0 && canScrollDown) {
        handleScrollDown();
      } else if (e.deltaY < 0 && canScrollUp) {
        handleScrollUp();
      }
    },
    [showScrollControls, canScrollUp, canScrollDown, handleScrollDown, handleScrollUp],
  );

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientY - rect.top,
      y: e.clientX - rect.left,
    });
  };

  const listContent = (
    <motion.div
      transition={springTransition}
      className="flex flex-col gap-y-0.5"
      animate={{y: showScrollControls ? -startIndex * ITEM_TOTAL_HEIGHT : 0}}>
      {items.map(item => (
        <RenderItem item={item} tabID={tabId} isDark={isDark} activePage={pageID} key={`${item.title}_nav`} />
      ))}
    </motion.div>
  );

  return (
    <motion.div
      onMouseLeave={() => {
        setIsHoveringDock(false);
      }}
      className={
        'relative backdrop-blur-xl rounded-2xl p-1 shadow-lg border border-surface-secondary' +
        ' dark:bg-LynxRaisinBlack bg-white'
      }
      ref={dockRef}
      animate={{opacity: 1, x: 0}}
      onMouseMove={handleMouseMove}
      initial={{opacity: 0, x: -50}}
      onMouseEnter={() => setIsHoveringDock(true)}>
      {/* Animated border gradient following cursor */}
      <AnimatePresence>
        {isHoveringDock && (
          <motion.div
            style={{
              background:
                `radial-gradient(300px circle at ${mousePosition.y}px` +
                ` ${mousePosition.x}px, ${primaryColor}${isDark ? '33' : '25'}, transparent 40%)`,
            }}
            exit={{opacity: 0}}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="absolute inset-0 rounded-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Animated border line following cursor */}
      <AnimatePresence>
        {isHoveringDock && (
          <motion.div
            style={{
              inset: '-1px',
              padding: '2px',
              background:
                `radial-gradient(100px circle at ${mousePosition.y}px` +
                ` ${mousePosition.x}px, ${primaryColor}${isDark ? '99' : '80'}, transparent 70%)`,
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            exit={{opacity: 0}}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            className="absolute rounded-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Viewport for list items */}
        {showScrollControls ? (
          <div
            style={{
              height: maxItems * ITEM_TOTAL_HEIGHT - GAP,
            }}
            onWheel={handleWheel}
            className="overflow-hidden">
            {listContent}
          </div>
        ) : (
          listContent
        )}

        {/* Scroll Up Arrow Overlay */}
        <AnimatePresence>
          {showScrollControls && canScrollUp && (
            <motion.div
              style={{
                background: `linear-gradient(to bottom, ${isDark ? '#121217' : '#FFFFFF'} 20%, transparent)`,
              }}
              exit={{opacity: 0}}
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={fadeTransition}
              className="absolute top-0 left-0 right-0 pointer-events-none rounded-xl z-10">
              <ScrollArrow direction="up" isDark={isDark} onClick={handleScrollUp} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll Down Arrow Overlay */}
        <AnimatePresence>
          {showScrollControls && canScrollDown && (
            <motion.div
              style={{
                background: `linear-gradient(to top, ${isDark ? '#121217' : '#FFFFFF'} 20%, transparent)`,
              }}
              exit={{opacity: 0}}
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              transition={fadeTransition}
              className="absolute bottom-0 left-0 right-0 pointer-events-none rounded-xl z-10">
              <ScrollArrow isDark={isDark} direction="down" onClick={handleScrollDown} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default NavigationDock;
