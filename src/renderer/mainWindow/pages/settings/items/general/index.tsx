import {Kbd} from '@heroui/react';
import SettingsSection from '@lynx/components/SettingsSection';
import {SettingPage_Icon} from '@lynx_assets/icons/pages';
import {ShieldIcon} from '@solar-icons/react/bold-duotone';

import CollectErrors from './CollectErrors';
import Confirm from './Confirm';
import Taskbar from './Taskbar';
import Theme from './Theme';
import TitleName from './TitleName';

export const SettingsGeneralId = 'settings_app_elem';

/**
 * General Settings section component.
 * Aggregates various general application settings like Theme, Taskbar, and Tooltips.
 */
export default function SettingsGeneral() {
  return (
    <>
      <SettingsSection title="General" id={SettingsGeneralId} icon={<SettingPage_Icon className="size-5" />}>
        <Theme />
        <Taskbar />
        <TitleName />
        <CollectErrors />
      </SettingsSection>
      <SettingsSection
        description={
          <span>
            Hold{' '}
            <Kbd className="text-xs">
              <Kbd.Content>CTRL</Kbd.Content>
            </Kbd>{' '}
            to bypass any of these confirmations.
          </span>
        }
        title="Confirmations"
        id={SettingsGeneralId}
        icon={<ShieldIcon className="size-5" />}>
        <Confirm />
      </SettingsSection>
    </>
  );
}
