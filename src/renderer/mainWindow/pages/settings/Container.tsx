import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import Fuse from 'fuse.js';
import {compact} from 'lodash-es';
import {type ComponentType, useMemo} from 'react';

import SettingsBrowser, {SettingsBrowserId} from './items/browser';
import SettingsCard, {SettingsCardId} from './items/card';
import SettingsClear, {SettingsClearId} from './items/clear';
import SettingsData, {SettingsDataId} from './items/data';
import SettingsGeneral, {SettingsGeneralId} from './items/general';
import SettingsHotkeys, {SettingsHotkeysId} from './items/hotkeys';
import SettingsPerformance, {SettingsPerformanceId} from './items/performance';
import SettingsStartup, {SettingsStartupId} from './items/startup';
import SettingsTerminal, {SettingsTerminalId} from './items/terminal';

/** Object mapping setting section names to their respective unique IDs */
export const settingsSectionId = {
  SettingsCardId,
  SettingsGeneralId,
  SettingsTerminalId,
  SettingsBrowserId,
  SettingsStartupId,
  SettingsClearId,
  SettingsDataId,
  SettingsHotkeysId,
  SettingsPerformanceId,
} as const;

/** Definition structure for a given settings section */
type SettingsSectionDefinition = {
  /** Display title of the section */
  title: string;
  /** React component rendering the section contents */
  Component: ComponentType<any>;
  /** Unique element ID used for scrolling/searching */
  elementId: string;
};

/** Props for the SettingsSections component */
export type SettingsSectionsProps = {
  /** Map of section IDs to searchable string representations of their content */
  sectionTexts: Map<string, string>;
};

// Moving static definitions outside the component to avoid unnecessary re-creation or memoization
const builtInSections: SettingsSectionDefinition[] = [
  {title: 'General', elementId: settingsSectionId.SettingsGeneralId, Component: SettingsGeneral},
  {title: 'Startup', elementId: settingsSectionId.SettingsStartupId, Component: SettingsStartup},
  {title: 'Performance', elementId: settingsSectionId.SettingsPerformanceId, Component: SettingsPerformance},
  {title: 'Card', elementId: settingsSectionId.SettingsCardId, Component: SettingsCard},
  {title: 'Terminal', elementId: settingsSectionId.SettingsTerminalId, Component: SettingsTerminal},
  {title: 'Browser', elementId: settingsSectionId.SettingsBrowserId, Component: SettingsBrowser},
  {title: 'Hotkeys', elementId: settingsSectionId.SettingsHotkeysId, Component: SettingsHotkeys},
  {title: 'Data', elementId: settingsSectionId.SettingsDataId, Component: SettingsData},
  {title: 'Clear', elementId: settingsSectionId.SettingsClearId, Component: SettingsClear},
];

/**
 * Renders all available settings sections (built-in and extension-provided)
 * and filters them based on the active search or selected navigation tab.
 */
export const SettingsSections = ({sectionTexts}: SettingsSectionsProps) => {
  const content = extensionsData.customizePages.settings.add.content;
  const searchValue = useSettingsState('searchValue');
  const selectedSection = useSettingsState('selectedSection');

  const extensionSections = useMemo<SettingsSectionDefinition[]>(
    () =>
      content.map((Content, index) => ({
        title: Content.displayName ?? Content.name ?? `Custom Section ${index + 1}`,
        Component: Content,
        elementId: (Content as any).sectionId ?? (Content as any).settingsSectionId ?? '',
      })),
    [content],
  );

  const sectionsWithVisibility = useMemo(() => {
    const allSections = [...builtInSections, ...extensionSections];

    if (!searchValue) {
      const targetSection = selectedSection || SettingsGeneralId;

      return compact(
        allSections.map(section => (section.elementId === targetSection ? {...section, visible: true} : null)),
      );
    }

    const searchableSections = allSections.map(section => ({
      section,
      title: section.title,
      dynamicText: section.elementId ? sectionTexts.get(section.elementId) : '',
    }));

    const fuse = new Fuse(searchableSections, {
      keys: ['title', 'dynamicText'],
      threshold: 0.4,
    });

    const results = fuse.search(searchValue);
    const visibleSectionIds = new Set(results.map(r => r.item.section.elementId));

    return allSections.map(section => ({
      ...section,
      visible: visibleSectionIds.has(section.elementId),
    }));
  }, [extensionSections, searchValue, sectionTexts, selectedSection]);

  const hasVisibleSection = sectionsWithVisibility.some(section => section.visible);

  return (
    <>
      {!hasVisibleSection && searchValue && (
        <div className="py-10 text-center text-sm text-muted">No settings match “{searchValue}”.</div>
      )}
      {sectionsWithVisibility.map(({Component, elementId, title, visible}, index) => (
        <div key={elementId || `${title}_${index}`} className={visible ? 'contents' : 'hidden'}>
          <Component />
        </div>
      ))}
    </>
  );
};
