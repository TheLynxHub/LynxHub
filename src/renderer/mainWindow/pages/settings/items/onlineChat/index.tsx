import SettingsSection from '@lynx/components/SettingsSection';
import {WindowFrame} from '@solar-icons/react-perf/BoldDuotone';

import DisableSpotlight from './DisableSpotlight';
import SpotlightAlwaysOnTop from './SpotlightAlwaysOnTop';
import SpotlightKeepInBackground from './SpotlightKeepInBackground';
import SpotlightRememberPosition from './SpotlightRememberPosition';
import SpotlightRememberSize from './SpotlightRememberSize';
import SpotlightShowTaskbar from './SpotlightShowTaskbar';

export const SettingsOnlineChatId = 'settings_online_chat_elem';

/**
 * Settings section for Online Chat configurations.
 * Aggregates various configurations for native online chat wrappers and spotlight quick chat window.
 */
export default function SettingsOnlineChat() {
  return (
    <>
      <SettingsSection title="Spotlight" id={SettingsOnlineChatId} icon={<WindowFrame className="size-5" />}>
        <DisableSpotlight />
        <SpotlightKeepInBackground />
        <SpotlightAlwaysOnTop />
        <SpotlightShowTaskbar />
        <SpotlightRememberSize />
        <SpotlightRememberPosition />
      </SettingsSection>
    </>
  );
}
