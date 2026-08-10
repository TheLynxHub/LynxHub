import {Card} from '@heroui/react';
import {usePluginsState} from '@lynx/redux/reducers/plugins';
import {WidgetAddIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {memo} from 'react';

import PreviewBody from './Body';
import PreviewHeader from './Header';

/**
 * Empty state placeholder shown when no plugin is selected.
 * Displays a centered icon and instructional text.
 */
function EmptySelectionPlaceholder() {
  return (
    <div
      className={
        'bg-white dark:bg-LynxRaisinBlack size-full flex items-center' +
        ' justify-center gap-y-4 flex-col px-4 text-center'
      }>
      <WidgetAddIcon className="size-16" />
      <span className="text-lg">Select a plugin from the list to begin your exploration.</span>
    </div>
  );
}

/**
 * Plugin preview panel that occupies the right side of the plugins page.
 * Shows either an empty state prompt or the selected plugin's header and body.
 */
const PluginPreviewPanel = memo(() => {
  const selectedPlugin = usePluginsState('selectedPlugin');
  const installedList = usePluginsState('installedList');

  // Derive installed extension info directly during render instead of useMemo,
  // since the lookup is cheap and avoids a hook overhead.
  const installedPlugin = installedList.find(item => item.id === selectedPlugin?.metadata.id);

  return (
    <Card
      className={
        'absolute right-2 inset-y-4 overflow-hidden' +
        ' transition-[left] duration-500 sm:left-104 lg:left-124 2xl:left-148' +
        ` flex flex-col`
      }
      variant="secondary">
      {isEmpty(selectedPlugin) ? (
        <EmptySelectionPlaceholder />
      ) : (
        <>
          <PreviewHeader installedPlugin={installedPlugin} />
          <PreviewBody isInstalled={!!installedPlugin} />
        </>
      )}
    </Card>
  );
});

PluginPreviewPanel.displayName = 'PluginPreviewPanel';

export default PluginPreviewPanel;
