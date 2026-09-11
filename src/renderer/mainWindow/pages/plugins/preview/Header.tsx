import {Avatar, Button, Chip, Description, Label} from '@heroui/react';
import {usePluginsState} from '@lynx/redux/reducers/plugins';
import {useUserState} from '@lynx/redux/reducers/user';
import {formatNumber} from '@lynx/utils';
import {PluginInstalledItem} from '@lynx_common/types/plugins';
import {extractGitUrl, getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {getPluginIconUrl} from '@lynx_common/utils/plugins';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {
  BoxMinimalisticIcon,
  CalendarMinimalisticIcon,
  HomeAngle2Icon,
  SquareTopDownIcon,
  UserIcon,
  WidgetAddIcon,
} from '@solar-icons/react/bold-duotone';
import {ArrowRightIcon, DownloadMinimalisticIcon} from '@solar-icons/react/line-duotone';
import {useCallback, useMemo} from 'react';

import PluginActionButtons from './ActionButtons';

/**
 * Props for the {@link PluginPreviewHeader} component.
 */
interface PluginPreviewHeaderProps {
  /** The installed plugin entry if the selected plugin is currently installed, or undefined. */
  installedPlugin: PluginInstalledItem | undefined;
}

/**
 * Header section of the plugin preview panel.
 * Displays plugin metadata (title, version, date, type, owner, homepage link)
 * and exposes action buttons for install/uninstall/update operations.
 */
export default function PluginPreviewHeader({installedPlugin}: PluginPreviewHeaderProps) {
  const selectedPlugin = usePluginsState('selectedPlugin');
  const syncList = usePluginsState('syncList');

  // updateChannel is subscribed but only used to trigger recomputation when the user's
  // subscription tier changes (which may affect available versions).
  useUserState('updateChannel');

  const {resolvedVersion, releaseDate, isUpgradeAvailable, targetVersion, isInstalled} = useMemo(() => {
    const firstCompatibleVersion = selectedPlugin?.versions.find(v => v.isCompatible);

    const isInstalled = !!installedPlugin;

    const resolvedVersion = installedPlugin?.version || firstCompatibleVersion?.version || 'N/A';
    const syncTarget = syncList.find(item => item.id === selectedPlugin?.metadata.id);
    const isUpgradeAvailable = syncTarget?.type === 'upgrade';
    const targetVersion = syncTarget?.version;
    const releaseDate = selectedPlugin?.changes.find(entry => entry.version === resolvedVersion)?.date || 'N/A';

    return {resolvedVersion, releaseDate, isUpgradeAvailable, targetVersion, isInstalled};
  }, [installedPlugin, selectedPlugin, syncList]);

  const handleOpenHomePage = useCallback(() => {
    AddBreadcrumb_Renderer(`Plugin homepage: id:${selectedPlugin?.metadata.id}`);
    window.open(selectedPlugin?.url);
  }, [selectedPlugin?.metadata.id, selectedPlugin?.url]);

  const pluginOwner = extractGitUrl(selectedPlugin?.url || '').owner;
  const pluginType = selectedPlugin?.metadata.type;
  const pluginIconUrl = getCacheUrl(getPluginIconUrl(selectedPlugin?.url));

  return (
    <div
      className={
        `w-full flex flex-col sm:gap-y-2 shrink-0 ` + `${isInstalled ? 'min-[77rem]:flex-row' : 'min-[53rem]:flex-row'}`
      }>
      <div className="w-full flex flex-col">
        <div className="inline-flex items-center gap-2">
          <Avatar className="rounded-lg">
            <Avatar.Image src={pluginIconUrl} alt={selectedPlugin?.metadata.title} />
            {selectedPlugin && (
              <Avatar.Fallback>{getFallbackString(selectedPlugin?.metadata.title || '')}</Avatar.Fallback>
            )}
          </Avatar>
          <div className="flex flex-col">
            <Label className="text-lg">{selectedPlugin?.metadata.title}</Label>
            <Description>
              <div className="flex flex-row gap-x-2 items-center">
                {/* Version chip with optional upgrade/downgrade arrow indicator */}
                <Chip size="sm" variant="tertiary" className="text-muted tracking-tight">
                  <BoxMinimalisticIcon className="size-3.5" />
                  <span>{resolvedVersion}</span>
                  {targetVersion && (
                    <>
                      <ArrowRightIcon className="size-2.5" />
                      <span className={isUpgradeAvailable ? 'text-success' : 'text-warning'}>{targetVersion}</span>
                    </>
                  )}
                </Chip>

                {/* Release date chip */}
                <Chip size="sm" variant="tertiary" className="text-muted">
                  <CalendarMinimalisticIcon className="size-3.5" />
                  {releaseDate}
                </Chip>

                {/* Downloads count chip */}
                {selectedPlugin?.downloadsCount !== undefined && (
                  <Chip size="sm" variant="tertiary" className="text-muted font-JetBrainsMono">
                    <DownloadMinimalisticIcon className="size-3.5" />
                    <span>{formatNumber(selectedPlugin.downloadsCount).toLowerCase()}</span>
                  </Chip>
                )}

                {/* Plugin type indicator (extension vs module) */}
                <div
                  className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                    pluginType === 'extension'
                      ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400'
                      : 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400'
                  }`}>
                  <WidgetAddIcon className="size-3.5" />
                  <span className="capitalize">{pluginType || 'Extension'}</span>
                </div>
              </div>
            </Description>
          </div>
        </div>

        {/* Owner & homepage link row */}
        <div className="flex flex-row items-center ml-12">
          <Chip variant="tertiary">
            <UserIcon className="size-3.5" />
            {pluginOwner}
          </Chip>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onPress={handleOpenHomePage}
            aria-label="Open plugin home page">
            <HomeAngle2Icon className="size-3.5" />
            Home Page
            <SquareTopDownIcon className="size-2.5" />
          </Button>
        </div>
      </div>

      <PluginActionButtons isInstalled={isInstalled} currentVersion={resolvedVersion} />
    </div>
  );
}
