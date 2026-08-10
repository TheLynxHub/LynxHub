import {Button, Card, Header, ScrollShadow} from '@heroui/react';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {DashboardPage_Icon} from '@lynx_assets/icons/pages';
import {BugIcon, DownloadIcon, HeartPulse2Icon, InfoCircleIcon} from '@solar-icons/react/bold-duotone';
import {motion} from 'framer-motion';
import {memo, ReactNode, useCallback, useMemo} from 'react';

import SettingsSearchHighlight from '../settings/SettingsSearchHighlight';
import {dashboardSectionId} from './Container';
import {useScrollSpy} from './useScrollSpy';

type GroupItem = {
  icon: ReactNode;
  title: string;
  className?: string;
  elementId: string;
};

type GroupProps = {
  title: string;
  items: GroupItem[];
  danger?: boolean;
};

const initialGroupSections: GroupProps[] = [
  {
    title: 'Application',
    items: [
      {
        title: 'Account',
        icon: <DashboardPage_Icon className="size-4 shrink-0" />,
        elementId: dashboardSectionId.DashboardProfileId,
      },
      {
        title: 'Updates',
        icon: <DownloadIcon className="size-4 shrink-0" />,
        elementId: dashboardSectionId.DashboardUpdateId,
      },
    ],
  },
  {
    title: 'Info',
    items: [
      {
        title: 'Credits',
        icon: <HeartPulse2Icon className="size-4 shrink-0" />,
        elementId: dashboardSectionId.DashboardCreditsId,
      },
      {
        title: 'About',
        icon: <InfoCircleIcon className="size-4 shrink-0" />,
        elementId: dashboardSectionId.DashboardAboutId,
      },
      {
        title: 'Help & Feedback',
        icon: <BugIcon className="size-4 shrink-0" />,
        elementId: dashboardSectionId.DashboardReportIssueId,
      },
    ],
  },
];

const allItemIds = initialGroupSections.flatMap(group => group.items.map(item => item.elementId));

/** Dashboard navigation bar group and items */
const DashboardGroupSection = memo(
  ({title, items, danger = false, activeSection}: GroupProps & {activeSection: string}) => {
    const onPress = useCallback((id: string) => {
      document.getElementById(id)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, []);

    return (
      <div className="flex flex-col gap-y-2 text-start">
        <Header className={`font-semibold uppercase tracking-tight ${danger ? 'text-danger' : ''}`}>{title}</Header>
        <div className="flex flex-col gap-y-1">
          {items.map(item => (
            <Button
              className={
                `duration-100 overflow-visible ${activeSection === item.elementId && 'cursor-default'}` +
                ` ${item.className}`
              }
              size="sm"
              variant="ghost"
              key={`${item.title}_settings_section`}
              onPress={() => onPress(item.elementId)}
              fullWidth>
              <div
                className={
                  'z-10 flex justify-start w-full items-center gap-x-1.5 text-[0.82rem] font-medium ' +
                  `${activeSection === item.elementId && 'text-accent-foreground'} transition duration-200`
                }>
                {item.icon}
                <SettingsSearchHighlight text={item.title} />
              </div>
              {activeSection === item.elementId && (
                <motion.div
                  layoutId="setting_nav_indicator"
                  transition={{duration: 0.4, type: 'spring'}}
                  className="absolute inset-0 z-0 bg-accent rounded-full"
                />
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  },
);

const DashboardNavigation = memo(() => {
  const buttons = useMemo(
    () => extensionsData.customizePages.dashboard.add.navButton as React.ComponentType<any>[],
    [],
  );

  const activeSection = useScrollSpy(allItemIds);

  return (
    <Card variant="secondary" className="h-full my-2 w-48 shrink-0">
      <Card.Header className="flex flex-row gap-x-2 items-center">
        <DashboardPage_Icon className="size-5" />
        <span>Dashboard</span>
      </Card.Header>
      <Card.Content>
        <ScrollShadow className="h-full flex flex-col gap-y-3">
          {initialGroupSections.map((section, index) => (
            <DashboardGroupSection key={index} {...section} activeSection={activeSection} />
          ))}
          {buttons.map((Btn, index) => (
            <Btn key={`nav-btn-${index}`} />
          ))}
        </ScrollShadow>
      </Card.Content>
    </Card>
  );
});

export default DashboardNavigation;
