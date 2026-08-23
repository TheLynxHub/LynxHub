import SettingsSection from '@lynx/components/SettingsSection';
import {isWin} from '@lynx_common/utils';
import {HistoryIcon, RocketIcon} from '@solar-icons/react/bold-duotone';

import DisableLoadingAnim from './DisableLoadingAnim';
import LastSize from './LastSize';
import SessionRestore from './SessionRestore';
import StartMaximized from './StartMaximized';
import StartMinimized from './StartMinimized';
import System from './System';

export const SettingsStartupId = 'settings_startup_elem';

/**
 * Settings section for startup configurations.
 */
export default function SettingsStartup() {
  return (
    <>
      <SettingsSection title="Startup" id={SettingsStartupId} icon={<RocketIcon className="size-5" />}>
        {isWin && <System />}
        <LastSize />
        <StartMaximized />
        <StartMinimized />
        <DisableLoadingAnim />
      </SettingsSection>
      <SettingsSection title="Session" id={SettingsStartupId} icon={<HistoryIcon className="size-5" />}>
        <SessionRestore />
      </SettingsSection>
    </>
  );
}
