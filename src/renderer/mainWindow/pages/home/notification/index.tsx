import {Badge, Button, Drawer, Label, ProgressBar, ScrollShadow, useOverlayState} from '@heroui/react';
import EmptyStateCard from '@lynx/components/EmptyStateCard';
import {tabsActions} from '@lynx/redux/reducers/tabs';
import {useUserState} from '@lynx/redux/reducers/user';
import {AppDispatch} from '@lynx/redux/store';
import {AvailablePageIDs, LYNXHUB_WEBSITE, PageID, PageTitles} from '@lynx_common/consts';
import {NotificationAction, NotificationData} from '@lynx_common/types';
import {isValidURL} from '@lynx_common/utils';
import staticsIpc from '@lynx_shared/ipc/statics';
import storageIpc, {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {
  BellIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  DownloadIcon,
  GiftIcon,
  HeartIcon,
  InfoCircleIcon,
  ShieldWarningIcon,
  StarIcon,
  VolumeLoudIcon,
  Widget5Icon,
  WidgetIcon,
} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {AnimatePresence, motion, useReducedMotion} from 'framer-motion';
import {X} from 'lucide-react';
import {ComponentType, useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {formatMarkdown} from './markdown';

const IconMap: Record<string, ComponentType<{className?: string}>> = {
  BellIcon,
  InfoCircleIcon,
  ShieldWarningIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  GiftIcon,
  StarIcon,
  VolumeLoudIcon,
  HeartIcon,
  WidgetIcon,
  Widget5Icon,
  DownloadIcon,
};

/**
 * Hook to manage notification state and data fetching.
 *
 * @returns An object containing the current notifications, a refreshing flag, and a function to mark notifications as read.
 */
function useNotificationsData() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  /**
   * Filter and set unread notifications based on previously read notification IDs.
   */
  const filterAndSetNotifications = useCallback((data: NotificationData[]) => {
    storageIpc.get('notification').then(({readNotifs}) => {
      setNotifications(data.filter(notif => !readNotifs.includes(notif.id)));
    });
  }, []);

  /**
   * Fetch latest notifications and filter them.
   */
  const fetchAndFilterNotifications = useCallback(async () => {
    const data = await staticsIpc.getNotification();
    if (data) filterAndSetNotifications(data);
  }, [filterAndSetNotifications]);

  useEffect(() => {
    // Initial fetch
    fetchAndFilterNotifications();

    // Pull new static data and then fetch again
    setIsRefreshing(true);
    staticsIpc
      .pull()
      .catch(e => console.error('Failed to pull statics:', e))
      .finally(() => {
        fetchAndFilterNotifications().finally(() => setIsRefreshing(false));
      });
  }, [fetchAndFilterNotifications]);

  const markAsRead = useCallback((id: string) => {
    storageUtilsIpc.send.addReadNotif(id);
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  return {
    notifications,
    isRefreshing,
    markAsRead,
  };
}

/**
 * Props for the NotificationItem component.
 */
interface NotificationItemProps {
  /** The notification data object to display. */
  notif: NotificationData;
  /** Callback fired when the user dismisses/reads the notification. */
  onRead: (id: string) => void;
  /** Function to handle navigation to an internal page. */
  onNavigatePage: (destination: AvailablePageIDs | string) => void;
  /** Callback to close the notification drawer, usually after navigating. */
  onCloseDrawer: () => void;
  delay?: number;
  userEntitlement: string;
}

/**
 * A sub-component rendering a single notification card matching the website overlay rendering.
 */
function NotificationItem({
  notif,
  onRead,
  onNavigatePage,
  onCloseDrawer,
  delay,
  userEntitlement,
}: NotificationItemProps) {
  const shouldReduceMotion = useReducedMotion();
  const {id, title, body, style, icon, iconColor, bgColor, textColor, image, actions, releaseType} = notif;

  // Resolve visual presets
  let cardBgClass = 'bg-background/90 backdrop-blur-md border-border/80 text-foreground';
  let titleColorClass = 'text-foreground';

  if (style === 'info') {
    cardBgClass = 'bg-accent-soft/10 dark:bg-accent-soft/5 backdrop-blur-md border-accent/20';
    titleColorClass = 'text-accent';
  } else if (style === 'success') {
    cardBgClass = 'bg-success/10 dark:bg-success/5 backdrop-blur-md border-success/20';
    titleColorClass = 'text-success';
  } else if (style === 'warning') {
    cardBgClass = 'bg-warning/10 dark:bg-warning/5 backdrop-blur-md border-warning/20';
    titleColorClass = 'text-warning';
  } else if (style === 'danger') {
    cardBgClass = 'bg-danger/10 dark:bg-danger/5 backdrop-blur-md border-danger/20';
    titleColorClass = 'text-danger';
  } else if (style === 'custom') {
    cardBgClass = `${bgColor || 'bg-background/90 backdrop-blur-md'} border-border/80`;
    titleColorClass = textColor || 'text-foreground';
  }

  // Resolve Icon
  const IconComponent = icon && IconMap[icon] ? IconMap[icon] : null;

  // Resolve Icon Color
  let iconColorClass = 'text-foreground';
  if (iconColor) {
    if (iconColor === 'primary' || iconColor === 'accent') iconColorClass = 'text-accent';
    else if (iconColor === 'secondary') iconColorClass = 'text-muted';
    else if (iconColor === 'success') iconColorClass = 'text-success';
    else if (iconColor === 'warning') iconColorClass = 'text-warning';
    else if (iconColor === 'danger') iconColorClass = 'text-danger';
    else if (iconColor === 'default') iconColorClass = 'text-muted-foreground';
    else iconColorClass = iconColor;
  } else {
    if (style === 'info') iconColorClass = 'text-accent';
    else if (style === 'success') iconColorClass = 'text-success';
    else if (style === 'warning') iconColorClass = 'text-warning';
    else if (style === 'danger') iconColorClass = 'text-danger';
  }

  // Parse actions
  let actionsList: NotificationAction[] = [];
  if (actions) {
    actionsList = typeof actions === 'string' ? JSON.parse(actions) : actions;
  }

  // Check version access
  const isRestrictedRelease = releaseType === 'EA' || releaseType === 'INSIDER';
  const hasReleaseAccess =
    !isRestrictedRelease ||
    (releaseType === 'EA' && (userEntitlement === 'EA' || userEntitlement === 'INSIDER')) ||
    (releaseType === 'INSIDER' && userEntitlement === 'INSIDER');

  if (!hasReleaseAccess) {
    actionsList = [
      {
        label: 'Upgrade to Get Access',
        url: '/pricing',
        variant: 'solid',
      },
    ];
  }

  const handleActionPress = (url: string) => {
    onCloseDrawer();
    if (url.startsWith('/')) {
      window.open(`${LYNXHUB_WEBSITE}${url}`);
    } else if (isValidURL(url)) {
      window.open(url);
    } else {
      onNavigatePage(url);
    }
  };

  return (
    <motion.div
      transition={{
        duration: shouldReduceMotion ? 0.1 : 0.18,
        delay: delay || 0,
        ease: [0.23, 1, 0.32, 1] as const,
      }}
      layoutId={id}
      className="px-1"
      layout={!shouldReduceMotion}
      animate={{y: 0, opacity: 1, scale: 1}}
      initial={{y: shouldReduceMotion ? 0 : 8, opacity: 0, scale: shouldReduceMotion ? 1 : 0.98}}
      exit={{opacity: 0, scale: shouldReduceMotion ? 1 : 0.95, filter: shouldReduceMotion ? 'none' : 'blur(4px)'}}>
      <div className={`flex flex-col border p-4 rounded-2xl shadow-xl ${cardBgClass} relative overflow-hidden`}>
        {/* Dismiss Button */}
        <Button
          className={
            'absolute top-3.5 right-3.5 size-7 rounded-full text-muted ' +
            'hover:text-foreground hover:bg-default/20 transition-colors cursor-pointer'
          }
          size="sm"
          variant="secondary"
          onPress={() => onRead(id)}
          isIconOnly>
          <X className="size-3.5" />
        </Button>

        <div className="flex gap-3 pr-6">
          {IconComponent && (
            <div className="shrink-0 mt-0.5">
              <div className="p-1.5 bg-default/20 dark:bg-default/10 rounded-lg inline-flex">
                <IconComponent className={`size-4.5 ${iconColorClass}`} />
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <div className="flex flex-wrap gap-1.5 items-center mb-1">
                <h4 className={`text-sm font-bold leading-tight select-none ${titleColorClass}`}>{title}</h4>
                {releaseType && (
                  <span
                    className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${
                      releaseType === 'PUBLIC'
                        ? 'bg-success/10 border-success/20 text-success'
                        : 'bg-warning/10 border-warning/20 text-warning'
                    }`}>
                    {releaseType}
                  </span>
                )}
              </div>
            )}
            <div className="text-xs leading-relaxed wrap-break-word select-none text-muted-foreground">
              {formatMarkdown(body)}
            </div>

            {image && (
              <div className="mt-3 overflow-hidden rounded-lg border border-default/30 max-h-36">
                <img src={image} alt="Notification visual" className="w-full h-auto object-cover max-h-36" />
              </div>
            )}

            {!hasReleaseAccess && (
              <div
                className={
                  'mt-2.5 p-2.5 bg-warning/10 border border-warning/20 rounded-xl ' +
                  'flex items-start gap-1.5 text-[10px] text-warning font-semibold leading-normal'
                }>
                <ShieldWarningIcon className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  This version is exclusive to {releaseType === 'INSIDER' ? 'Insider' : 'Early Access'} members. Upgrade
                  your plan to unlock downloads.
                </span>
              </div>
            )}

            {actionsList.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3.5">
                {actionsList.map((act, i) => {
                  const mappedVariant =
                    act.variant === 'bordered'
                      ? 'outline'
                      : act.variant === 'light'
                        ? 'ghost'
                        : act.variant === 'flat' || act.variant === 'solid'
                          ? 'primary'
                          : (act.variant as
                              'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger' | 'danger-soft') ||
                            'primary';
                  return (
                    <Button
                      className={
                        'text-xs font-semibold h-7.5 px-3.5 rounded-lg ' +
                        'cursor-pointer flex items-center justify-center'
                      }
                      key={i}
                      size="sm"
                      variant={mappedVariant}
                      onPress={() => handleActionPress(act.url)}>
                      {act.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * The Home Notification Drawer and Button component.
 * Displays an icon with a badge, and opens a drawer containing all unread notifications.
 */
export default function HomeNotificationDrawer() {
  const dispatch = useDispatch<AppDispatch>();
  const state = useOverlayState();
  const shouldReduceMotion = useReducedMotion();

  const {notifications, isRefreshing, markAsRead} = useNotificationsData();
  const updateChannel = useUserState('updateChannel');

  const handleOpenDrawer = useCallback(() => {
    AddBreadcrumb_Renderer(`Open Notifications`);
    state.open();
  }, []);

  const handleNavigatePage = useCallback(
    (destination: AvailablePageIDs | string) => {
      dispatch(
        tabsActions.setActivePage({
          pageID: PageID[destination],
          title: PageTitles[destination],
        }),
      );
    },
    [dispatch],
  );

  const userEntitlement = useMemo(() => {
    if (updateChannel === 'insider') return 'INSIDER';
    if (updateChannel === 'early_access') return 'EA';
    return 'FREE';
  }, [updateChannel]);

  const hasWarningOrDanger = useMemo(() => {
    return notifications.some(notif => notif.style === 'warning' || notif.style === 'danger');
  }, [notifications]);

  const totalNotificationCount = useMemo(() => {
    return notifications.length;
  }, [notifications]);

  const readAll = () => notifications.forEach(notif => markAsRead(notif.id));

  return (
    <>
      <Badge.Anchor>
        <Button variant="tertiary" className="shrink-0" onPress={handleOpenDrawer} isIconOnly>
          <BellIcon />
        </Button>
        {totalNotificationCount !== 0 && (
          <Badge size="sm" placement="top-left" color={hasWarningOrDanger ? 'warning' : 'success'}>
            {totalNotificationCount}
          </Badge>
        )}
      </Badge.Anchor>
      <Drawer isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Drawer.Backdrop className="top-10">
          <Drawer.Content placement="right" className="top-10 pb-10">
            <Drawer.Dialog className="w-lg px-0">
              {isRefreshing && (
                <ProgressBar size="sm" className="absolute -top-1 inset-x-0" isIndeterminate>
                  <ProgressBar.Track className="rounded-none">
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
              )}
              <Drawer.Header className="px-6">
                <Drawer.Heading className="flex justify-between">
                  <div className="flex items-center gap-x-1">
                    <BellIcon className="size-4" />
                    <Label>Notifications</Label>
                  </div>
                  <Button onPress={readAll} variant="tertiary" isIconOnly>
                    <CheckReadIcon className="size-4.5" />
                  </Button>
                </Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="pr-2">
                <ScrollShadow className="size-full pb-2 pr-3 pl-4">
                  <AnimatePresence mode="popLayout">
                    {totalNotificationCount <= 0 ? (
                      <motion.div
                        key="empty-notifications"
                        animate={{y: 0, opacity: 1}}
                        exit={{y: shouldReduceMotion ? 0 : 8, opacity: 0}}
                        initial={{y: shouldReduceMotion ? 0 : 8, opacity: 0}}
                        transition={{duration: shouldReduceMotion ? 0.1 : 0.18, ease: [0.23, 1, 0.32, 1] as const}}>
                        <EmptyStateCard
                          className="mt-4"
                          variant="secondary"
                          description="No notifications yet!"
                          icon={<BellIcon size={30} className="text-surface-secondary-foreground" />}
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="notifications-list" className="flex flex-col gap-y-4 mt-3">
                        <AnimatePresence mode="popLayout">
                          {notifications.map((notif, index) => (
                            <NotificationItem
                              notif={notif}
                              key={notif.id}
                              onRead={markAsRead}
                              delay={index * 0.04}
                              onCloseDrawer={state.close}
                              userEntitlement={userEntitlement}
                              onNavigatePage={handleNavigatePage}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ScrollShadow>
              </Drawer.Body>
              <Drawer.Footer className="px-6">
                <Button variant="secondary" onPress={state.close}>
                  Close
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}
