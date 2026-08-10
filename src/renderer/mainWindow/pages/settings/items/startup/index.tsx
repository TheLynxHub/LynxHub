import SettingsSection from '@lynx/components/SettingsSection';
import {isWin} from '@lynx_common/utils';
import {RocketIcon} from '@solar-icons/react/bold-duotone';

import DisableLoadingAnim from './DisableLoadingAnim';
import LastSize from './LastSize';
import StartMaximized from './StartMaximized';
import StartMinimized from './StartMinimized';
import StartPage from './StartPage';
import System from './System';

export const SettingsStartupId = 'settings_startup_elem';

/**
 * Settings section for startup configurations.
 */
export default function SettingsStartup() {
  return (
    <SettingsSection title="Startup" id={SettingsStartupId} icon={<RocketIcon className="size-5" />}>
      {isWin && <System />}
      <LastSize />
      <StartMaximized />
      <StartMinimized />
      <StartPage />
      <DisableLoadingAnim />
    </SettingsSection>
  );
}
