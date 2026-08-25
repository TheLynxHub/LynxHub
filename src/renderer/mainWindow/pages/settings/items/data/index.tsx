import {Button} from '@heroui/react';
import SettingsSection from '@lynx/components/SettingsSection';
import {topToast} from '@lynx/layouts/ToastProviders';
import applicationIpc from '@lynx_shared/ipc/application';
import filesIpc from '@lynx_shared/ipc/files';
import {DatabaseIcon, MoveToFolderIcon, RepeatIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

export const SettingsDataId = 'settings_data_elem';

/**
 * Renders the "Data" settings section.
 * Allows the user to view and change the application's root data directory,
 * where files like extensions, modules, and binaries are stored.
 */
export default function SettingsData() {
  const [currentPath, setCurrentPath] = useState<string>('');

  const loadDataPath = async () => {
    try {
      const result = await applicationIpc.invoke.getCurrentDataPath();
      setCurrentPath(result);
    } catch (error) {
      console.error('Failed to load current data path', error);
    }
  };

  useEffect(() => {
    loadDataPath();
  }, []);

  const handleChangeDataPath = async () => {
    try {
      const result = await applicationIpc.invoke.selectAnotherDataPath();
      topToast.success(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      topToast.danger(errorMessage);
    }
  };

  const handleOpenFolder = useCallback(() => {
    if (currentPath) {
      filesIpc.openPath(currentPath);
    }
  }, [currentPath]);

  const descriptionText = 'App data, including extensions, modules and binaries, will be saved here.';

  return (
    <SettingsSection
      title="Data"
      id={SettingsDataId}
      icon={<DatabaseIcon className="size-5" />}
      description={<SettingsSearchHighlight text={descriptionText} />}
      itemsCenter>
      <SettingsFilterItem
        searchTexts={[
          'Data',
          descriptionText,
          'data directory',
          'storage folder',
          'extensions storage',
          'modules folder',
          'binaries folder',
          'change data path',
          'restart required',
          'open folder in file explorer',
          currentPath,
        ]}>
        <div className="flex flex-col gap-y-2 w-full">
          <Button
            variant="tertiary"
            isDisabled={!currentPath}
            onPress={handleOpenFolder}
            className="bg-surface hover:bg-surface/50"
            fullWidth>
            <MoveToFolderIcon />
            <SettingsSearchHighlight text={currentPath || 'Loading path...'} />
          </Button>

          <Button variant="danger-soft" onPress={handleChangeDataPath} fullWidth>
            <RepeatIcon />
            <SettingsSearchHighlight text="Change (Restart Required)" />
          </Button>
        </div>
      </SettingsFilterItem>
    </SettingsSection>
  );
}
