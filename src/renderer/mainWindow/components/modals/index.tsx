import {extensionsData} from '@lynx/plugins/extensions/loader';
import {memo, useMemo} from 'react';

import {RestartModal} from './RestartModal';
import StarRepoModal from './StarRepoModal';
import UpdateApp from './updateApp';
import UpdatingNotification from './updateCard';
import UpgradePromoModal from './UpgradePromoModal';

/**
 * Main Modals container component.
 * Renders all global modals and handles dynamic modal injection from extensions.
 * Wrapped in `memo` to prevent unnecessary re-renders.
 */
const Modals = memo(() => {
  // Use extension-provided components if available, otherwise fall back to default implementations
  const ReplaceUpdateApp = useMemo(() => extensionsData.replaceModals.updateApp, []);

  const addModal = useMemo(() => extensionsData.addModal, []);

  return (
    <>
      <RestartModal />
      <UpdatingNotification />
      <UpgradePromoModal />
      <StarRepoModal />

      {ReplaceUpdateApp ? <ReplaceUpdateApp /> : <UpdateApp />}

      {addModal.map((Modal, index) => (
        <Modal key={index} />
      ))}
    </>
  );
});

export default Modals;
