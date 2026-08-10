import SettingsSection from '@lynx/components/SettingsSection';
import {CardIcon} from '@solar-icons/react/bold-duotone';

import UpdateInterval from './UpdateInterval';

export const SettingsCardId = 'settings_card_elem';

/**
 * Renders the "Card" settings section, containing options
 * for updating and managing dashboard cards.
 */
export default function SettingsCard() {
  return (
    <SettingsSection title="Card" id={SettingsCardId} icon={<CardIcon className="size-5" />} itemsCenter>
      <UpdateInterval />
    </SettingsSection>
  );
}
