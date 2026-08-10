import {Chip, Description, Key, Label, ListBox, Select} from '@heroui/react';
import {usePluginsState} from '@lynx/redux/reducers/plugins';
import pluginsIpc from '@lynx_shared/ipc/plugins';
import {BoxMinimalistic} from '@solar-icons/react-perf/BoldDuotone';
import {useCallback, useMemo} from 'react';

import {getStageColor, getStageDisplayName} from './utils';

/**
 * Props for the {@link PluginVersionSelector} component.
 */
interface PluginVersionSelectorProps {
  /** The currently installed version of the plugin. */
  currentVersion: string;
}

/**
 * Dropdown selector that allows users to choose a specific version/commit of a plugin to sync to.
 * Primarily used for upgrading, downgrading, or switching between release tracks.
 */
export default function PluginVersionSelector({currentVersion}: PluginVersionSelectorProps) {
  const selectedPlugin = usePluginsState('selectedPlugin');
  const syncList = usePluginsState('syncList');

  /**
   * Derives the available versions, currently selected sync version, and disabled versions
   * (incompatible) based on the plugin's metadata and existing sync items.
   */
  const {availableVersions, disabledVersionKeys, activeVersion} = useMemo(() => {
    const availableVersions = selectedPlugin?.versions || [];
    const installedVersionEntry = availableVersions.find(item => item.version === currentVersion);
    const disabledVersionKeys = availableVersions.filter(item => !item.isCompatible).map(item => item.version);

    // Check if there is already a pending sync entry for this plugin
    const pendingSyncEntry = syncList.find(item => item.id === selectedPlugin?.metadata.id);
    const activeVersion = pendingSyncEntry?.version || installedVersionEntry?.version || currentVersion || '';

    return {availableVersions, disabledVersionKeys, activeVersion};
  }, [selectedPlugin, syncList, currentVersion]);

  /**
   * Handles selection changes in the version dropdown.
   * Updates the sync list via IPC to mark the target version for synchronization.
   */
  const handleSelectionChange = useCallback(
    (key: Key | null) => {
      if (!key) return;
      const targetVersion = key as string;
      const pluginId = selectedPlugin?.metadata.id;

      if (pluginId && targetVersion) {
        pluginsIpc.updateSyncList(pluginId, targetVersion);
      }
    },
    [selectedPlugin?.metadata.id],
  );

  return (
    <Select
      className="w-fit"
      variant="primary"
      value={activeVersion}
      onChange={handleSelectionChange}
      disabledKeys={disabledVersionKeys}
      aria-label="Select target version">
      <Select.Trigger>
        <Select.Value>
          <span className="flex items-center gap-x-1.5 font-medium">
            <BoxMinimalistic className="size-3.5 shrink-0" />
            Target v{activeVersion}
          </span>
        </Select.Value>
        <Select.Indicator className="size-3" />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {availableVersions.map(version => (
            <ListBox.Item
              id={version.version}
              key={version.version}
              textValue={version.version}
              className="flex flex-col gap-y-1 pr-8">
              <ListBox.ItemIndicator />
              <Label
                className={`justify-between w-full flex ${
                  version.incompatibleReason ? 'text-warning' : 'text-success'
                }`}>
                {version.version}
                <Chip size="sm" variant="soft" color={getStageColor(version.stage)}>
                  {getStageDisplayName(version.stage)}
                </Chip>
              </Label>
              {version.incompatibleReason && (
                <Description className="text-warning/50 w-full">{version.incompatibleReason}</Description>
              )}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
