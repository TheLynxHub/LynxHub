import {Button, Card, Header, ScrollShadow, SearchField} from '@heroui/react';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {settingsActions, useSettingsState} from '@lynx/redux/reducers/settings';
import {Terminal_Icon} from '@lynx_assets/icons';
import {SettingPage_Icon} from '@lynx_assets/icons/pages';
import {
  Card as CardIcon,
  ChatSquare,
  Database,
  Earth,
  Keyboard,
  Rocket,
  SpeedometerMiddle,
  TrashBin2,
} from '@solar-icons/react-perf/BoldDuotone';
import {AnimatePresence, motion} from 'framer-motion';
import Fuse from 'fuse.js';
import {ReactNode, useCallback, useMemo} from 'react';
import {useDispatch} from 'react-redux';

import {settingsSectionId} from './Container';
import {SettingsGeneralId} from './items/general';
import SettingsSearchHighlight from './SettingsSearchHighlight';

/** Represents a single navigable item inside a settings group */
export type GroupItem = {
  /** Icon displayed next to the item title */
  icon: ReactNode;
  /** Display title for the underlying item */
  title: string;
  /** Optional theme color override for specific visual impact (e.g., danger actions) */
  className?: string;
  /** Target section element ID to navigate to */
  elementId: string;
};

/** Props structure for a navigation grouping of items */
export type GroupProps = {
  /** Title header for the settings group */
  title: string;
  /** Array of nested navigation items within this group */
  items: GroupItem[];
  /** Whether the section indicates danger/destructive actions */
  danger?: boolean;
};

const groupSections: GroupProps[] = [
  {
    title: 'Application',
    items: [
      {
        title: 'General',
        icon: <SettingPage_Icon className="size-4 shrink-0 " />,
        elementId: settingsSectionId.SettingsGeneralId,
      },
      {
        title: 'Startup',
        icon: <Rocket className="size-4 shrink-0" />,
        elementId: settingsSectionId.SettingsStartupId,
      },
      {
        title: 'Performance',
        icon: <SpeedometerMiddle className="size-4 shrink-0" />,
        elementId: settingsSectionId.SettingsPerformanceId,
      },
      {
        title: 'Card',
        icon: <CardIcon className="size-4 shrink-0" />,
        elementId: settingsSectionId.SettingsCardId,
      },
      {
        title: 'Terminal',
        icon: <Terminal_Icon className="size-4 shrink-0" />,
        elementId: settingsSectionId.SettingsTerminalId,
      },
      {
        title: 'Browser',
        icon: <Earth className="size-4 shrink-0" />,
        elementId: settingsSectionId.SettingsBrowserId,
      },
      {
        title: 'Chat Bridge',
        icon: <ChatSquare className="size-4 shrink-0" />,
        elementId: settingsSectionId.SettingsChatBridgeId,
      },
      {
        title: 'Hotkeys',
        icon: <Keyboard className="size-4 shrink-0" />,
        elementId: settingsSectionId.SettingsHotkeysId,
      },
    ],
  },
  {
    title: 'Data Management',
    items: [
      {
        title: 'Data',
        icon: <Database className="size-4 shrink-0" />,
        elementId: settingsSectionId.SettingsDataId,
      },
      {
        title: 'Clear',
        icon: <TrashBin2 className="size-4 shrink-0" />,
        className: 'text-danger',
        elementId: settingsSectionId.SettingsClearId,
      },
    ],
  },
];

/** Navigation bar group and items */
export const GroupSection = ({title, items, danger = false}: GroupProps) => {
  const dispatch = useDispatch();
  const selectedSection = useSettingsState('selectedSection');
  const setSelectedSection = useCallback(
    (value: string) => {
      dispatch(settingsActions.setSettingsState({key: 'selectedSection', value}));
    },
    [dispatch],
  );

  const targetSection = selectedSection || SettingsGeneralId;

  return (
    <div className="flex flex-col gap-y-2 text-start">
      <Header className={`font-semibold uppercase tracking-tight ${danger ? 'text-danger' : ''}`}>{title}</Header>
      <div className="flex flex-col gap-y-1">
        <AnimatePresence>
          {items.map(item => (
            <Button
              className={
                `duration-100 overflow-visible ${targetSection === item.elementId && 'cursor-default'}` +
                ` ${item.className}`
              }
              size="sm"
              variant="ghost"
              key={`${item.title}_settings_section`}
              onPress={() => setSelectedSection(item.elementId)}
              fullWidth>
              <div
                className={
                  'z-10 flex justify-start w-full items-center gap-x-1.5 text-[0.82rem] font-medium ' +
                  `${targetSection === item.elementId && 'text-accent-foreground'} transition duration-200`
                }>
                {item.icon}
                <SettingsSearchHighlight text={item.title} />
              </div>
              {targetSection === item.elementId && (
                <motion.div
                  layoutId="setting_nav_indicator"
                  transition={{duration: 0.4, type: 'spring'}}
                  className="absolute inset-0 z-0 bg-accent rounded-full"
                />
              )}
            </Button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

/** Props for the SettingsPageNav component */
export type SettingsPageNavProps = {
  /** Map of section IDs to their searchable text descriptions */
  sectionTexts: Map<string, string>;
};

const SettingsPageNav = ({sectionTexts}: SettingsPageNavProps) => {
  const dispatch = useDispatch();

  const searchValue = useSettingsState('searchValue');
  const setSearchValue = useCallback(
    (value: string) => {
      dispatch(settingsActions.setSearchValue(value));
    },
    [dispatch],
  );

  const buttons = extensionsData.customizePages.settings.add.navButton;

  // The arrays are small, so finding and filtering can be derived quickly on each render

  const groupsToRender = useMemo(() => {
    if (!searchValue) return groupSections;

    return groupSections
      .map(group => {
        const itemsWithSearchFields = group.items.map(item => ({
          item,
          title: item.title,
          groupTitle: group.title,
          sectionText: sectionTexts.get(item.elementId) ?? '',
        }));

        const fuse = new Fuse(itemsWithSearchFields, {
          keys: ['title', 'groupTitle', 'sectionText'],
          threshold: 0.4,
        });

        const matchedItems = fuse.search(searchValue).map(r => r.item.item);

        return {
          ...group,
          items: matchedItems,
        };
      })
      .filter(group => group.items.length > 0);
  }, [searchValue, groupSections, sectionTexts]);

  return (
    <Card variant="secondary" className="h-full my-2 w-48 shrink-0">
      <Card.Header className="flex flex-row gap-x-2 items-center">
        <SettingPage_Icon className="size-5" />
        <SettingsSearchHighlight text="Settings" />
      </Card.Header>
      <Card.Content className="flex flex-col">
        <SearchField value={searchValue} onChange={setSearchValue}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              spellCheck="false"
              placeholder="Search settings..."
              aria-label="Search settings sections"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <ScrollShadow className="h-full flex flex-col gap-y-3" hideScrollBar>
          {groupsToRender.length === 0 && searchValue && (
            <div className="px-3 text-xs text-muted">No sections match "{searchValue}".</div>
          )}

          {groupsToRender.map(section => (
            <GroupSection key={section.title} {...section} />
          ))}
          {buttons.map((Btn, index) => (
            <Btn key={index} />
          ))}
        </ScrollShadow>
      </Card.Content>
    </Card>
  );
};

export default SettingsPageNav;
