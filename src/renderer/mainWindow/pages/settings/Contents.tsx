import {ScrollShadow} from '@heroui/react';
import {memo} from 'react';

import {SettingsSections} from './Container';

/** Props for the SettingsPageContents component */
export type SettingsPageContentsProps = {
  /** Map of section IDs to their searchable text content */
  sectionTexts: Map<string, string>;
};

/**
 * Renders the scrollable container for settings sections.
 */
const SettingsPageContents = ({sectionTexts}: SettingsPageContentsProps) => {
  return (
    <ScrollShadow className="size-full pl-1 pr-4 py-2">
      <div className="flex flex-col gap-y-4">
        <SettingsSections sectionTexts={sectionTexts} />
      </div>
    </ScrollShadow>
  );
};

export default memo(SettingsPageContents);
