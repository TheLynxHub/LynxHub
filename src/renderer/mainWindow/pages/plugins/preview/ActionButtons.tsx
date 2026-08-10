import {Button, Spinner, useOverlayState} from '@heroui/react';
import {
  pluginsActions,
  useIsInstallingPlugin,
  useIsUninstallingPlugin,
  usePluginsState,
} from '@lynx/redux/reducers/plugins';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import {extractGitUrl} from '@lynx_common/utils';
import applicationIpc from '@lynx_shared/ipc/application';
import pluginsIpc from '@lynx_shared/ipc/plugins';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {DownloadMinimalisticIcon, SettingsMinimalisticIcon, TrashBin2Icon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {topToast} from '../../../layouts/ToastProviders';
import {UpdateButton} from '../Elements';
import ModuleConfigModal from '../ModuleConfigModal';
import SecurityWarning from '../SecurityWarning';
import VersionSelector from './Versions';

/**
 * Custom hook that encapsulates plugin install/uninstall IPC logic.
 * Manages dispatching breadcrumbs, managing loading states, and triggering restart prompts.
 */
function usePluginActions() {
  const dispatch = useDispatch<AppDispatch>();
  const selectedPlugin = usePluginsState('selectedPlugin');

  const installPlugin = useCallback(
    (targetVersion: string) => {
      if (!selectedPlugin?.url) return;

      const pluginId = selectedPlugin.metadata.id;
      AddBreadcrumb_Renderer(`Install Activity: Started installing "${selectedPlugin.metadata.title}"`);
      dispatch(pluginsActions.manageSet({key: 'installing', id: pluginId, operation: 'add'}));

      const matchedVersion = selectedPlugin.versions.find(v => v.version === targetVersion);

      pluginsIpc.install(selectedPlugin.url, matchedVersion?.version || targetVersion).then(wasInstalled => {
        dispatch(pluginsActions.manageSet({key: 'installing', id: pluginId, operation: 'remove'}));
        if (wasInstalled) {
          AddBreadcrumb_Renderer(`Install Activity: Finished installing "${selectedPlugin.metadata.title}"`);
          topToast.success(`${selectedPlugin.metadata.title} installed successfully`);
          showRestartModal(dispatch, 'To apply the installation, please restart the app.');
          if (matchedVersion) {
            dispatch(
              pluginsActions.addInstalled({
                version: matchedVersion.version,
                url: selectedPlugin.url,
                id: pluginId,
              }),
            );
          }
        }
      });
    },
    [selectedPlugin, dispatch],
  );

  const uninstallPlugin = useCallback(() => {
    const pluginId = selectedPlugin?.metadata.id;
    if (!pluginId) return;

    AddBreadcrumb_Renderer(`Install Activity: Started uninstalling "${selectedPlugin.metadata.title}"`);
    dispatch(pluginsActions.manageSet({key: 'unInstalling', id: pluginId, operation: 'add'}));

    pluginsIpc.uninstall(pluginId).then(wasUninstalled => {
      dispatch(pluginsActions.manageSet({key: 'unInstalling', id: pluginId, operation: 'remove'}));
      if (wasUninstalled) {
        AddBreadcrumb_Renderer(`Install Activity: Finished uninstalling "${selectedPlugin.metadata.title}"`);
        topToast.success(`${selectedPlugin.metadata.title} uninstalled successfully`);
        showRestartModal(dispatch, 'To complete the uninstallation, please restart the app.');
        dispatch(pluginsActions.removeInstalled(pluginId));
      }
    });
  }, [selectedPlugin, dispatch]);

  return {installPlugin, uninstallPlugin};
}

/**
 * Props for the {@link PluginActionButtons} component.
 */
interface PluginActionButtonsProps {
  /** Whether the currently selected plugin is installed. */
  isInstalled: boolean;
  /** The resolved current version string for the selected plugin. */
  currentVersion: string;
}

/**
 * Action buttons panel for the plugin preview header.
 * Provides install, uninstall, update, configure, and version selection controls.
 */
export default function PluginActionButtons({isInstalled, currentVersion}: PluginActionButtonsProps) {
  const selectedPlugin = usePluginsState('selectedPlugin');
  const configModal = useOverlayState();

  const pluginId = selectedPlugin?.metadata.id || '';

  const isInstalling = useIsInstallingPlugin(pluginId);
  const isUninstalling = useIsUninstallingPlugin(pluginId);

  const isModuleType = selectedPlugin?.metadata.type === 'module';

  const {installPlugin, uninstallPlugin} = usePluginActions();

  // Check platform compatibility via a one-time system info query when plugin changes.
  const [isPlatformCompatible, setIsPlatformCompatible] = useState<boolean>(true);
  useEffect(() => {
    applicationIpc.invoke.getSystemInfo().then(systemInfo => {
      setIsPlatformCompatible(selectedPlugin?.versions.some(v => v.platforms.includes(systemInfo.os)) || false);
    });
  }, [selectedPlugin]);

  const [isSecurityWarningOpen, setIsSecurityWarningOpen] = useState<boolean>(false);

  /** Opens the security warning modal before proceeding with installation. */
  const handleInstallRequest = useCallback(() => {
    AddBreadcrumb_Renderer(`Plugin handleInstall: id:${pluginId}`);
    setIsSecurityWarningOpen(true);
  }, [pluginId]);

  /** Invokes the actual install once the user confirms via SecurityWarning. */
  const handleInstallConfirmed = useCallback(() => {
    installPlugin(currentVersion);
  }, [installPlugin, currentVersion]);

  const pluginOwner = useMemo(() => extractGitUrl(selectedPlugin?.url || '').owner, [selectedPlugin?.url]);

  return (
    <div className="flex flex-col gap-y-1 items-end">
      <SecurityWarning
        type="extension"
        owner={pluginOwner}
        isOpen={isSecurityWarningOpen}
        onAgree={handleInstallConfirmed}
        setIsOpen={setIsSecurityWarningOpen}
        title={selectedPlugin?.metadata.title}
      />

      {isModuleType && isInstalled && <ModuleConfigModal isOpen={configModal.isOpen} onClose={configModal.close} />}
      {isInstalled && <VersionSelector currentVersion={currentVersion} />}

      <div className="flex flex-row items-center gap-x-2">
        {/* Module configuration button – only visible for installed modules */}
        {isModuleType && isInstalled && (
          <Button size="sm" variant="secondary" onPress={configModal.open} aria-label="Open module configuration">
            <SettingsMinimalisticIcon />
            Configure
          </Button>
        )}

        <UpdateButton item={selectedPlugin!} />

        {/* Install or uninstall button depending on current installation state */}
        {isInstalled ? (
          <Button
            size="sm"
            variant="danger"
            onPress={uninstallPlugin}
            isPending={isUninstalling}
            aria-label="Uninstall plugin">
            {isUninstalling ? <Spinner size="sm" color="current" /> : <TrashBin2Icon />}
            {isUninstalling ? 'Uninstalling...' : 'Uninstall'}
          </Button>
        ) : (
          <Button
            size="sm"
            isPending={isInstalling}
            onPress={handleInstallRequest}
            isDisabled={!isPlatformCompatible}
            variant={isPlatformCompatible ? 'primary' : 'danger-soft'}
            aria-label={isPlatformCompatible ? 'Install plugin' : 'Plugin not compatible with your platform'}>
            {isInstalling ? <Spinner size="sm" color="current" /> : <DownloadMinimalisticIcon />}
            {!isPlatformCompatible ? 'Not Compatible' : isInstalling ? 'Installing...' : 'Install'}
          </Button>
        )}
      </div>
    </div>
  );
}
