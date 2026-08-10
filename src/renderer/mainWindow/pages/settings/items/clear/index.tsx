import SettingsSection from '@lynx/components/SettingsSection';
import {AlbumIcon, TrashBin2Icon} from '@solar-icons/react/bold-duotone';

import ImageCache from './ImageCache';
import ResetSettings from './ResetSettings';

export const SettingsClearId = 'settings_rmv_data_elem';

/**
 * Renders the "Clear" settings section.
 * Provides options to reset application settings, clear caches,
 * and view cache statistics.
 */
export default function SettingsClear() {
  return (
    <>
      <SettingsSection title="Clear" id={SettingsClearId} icon={<TrashBin2Icon className="size-5" />} itemsCenter>
        <ResetSettings />
      </SettingsSection>
      <SettingsSection
        description={
          'Image cache stores remote images locally for faster loading. ' +
          'Cache is automatically cleaned periodically based on your settings.'
        }
        title="Image Cache"
        id={SettingsClearId}
        icon={<AlbumIcon className="size-5" />}
        itemsCenter>
        <ImageCache />
      </SettingsSection>
    </>
  );
}
