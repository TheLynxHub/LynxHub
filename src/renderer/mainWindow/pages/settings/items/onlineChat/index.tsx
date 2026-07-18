import SettingsSection from '@lynx/components/SettingsSection';
import {ChatSquare} from '@solar-icons/react-perf/BoldDuotone';

import SpotlightAlwaysOnTop from './SpotlightAlwaysOnTop';
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
    <SettingsSection title="Online Chat" id={SettingsOnlineChatId} icon={<ChatSquare className="size-5" />}>
      <SpotlightAlwaysOnTop />
      <SpotlightShowTaskbar />
      <SpotlightRememberSize />
      <SpotlightRememberPosition />
    </SettingsSection>
  );
}
