import {Modal} from '@heroui/react';
import {ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {Dispatch, memo, SetStateAction} from 'react';

import TabModal from '../../../../../TabModal';

export interface LocateWarningModalProps {
  /** Enables or disables the visibility of the modal. */
  isOpen: boolean;
  /** Sets the state of the modal's visibility. */
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * Warning modal displayed when a user attempts to select the application's root data directory for card storage.
 * Prevents accidental data loss by warning the user to pick a different folder.
 */
function LocateWarningModal({isOpen, setIsOpen}: LocateWarningModalProps) {
  const onClose = () => setIsOpen(false);

  return (
    <TabModal size="sm" isOpen={isOpen}>
      <Modal.CloseTrigger onPress={onClose} />
      <Modal.Header>
        <Modal.Heading className="flex flex-row items-center gap-x-2 text-warning-soft-foreground">
          <ShieldWarningIcon className="size-8" />
          <span className="font-bold">Installation Directory</span>
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body>
        Saving data to an application's installation directory can result in{' '}
        <span className="font-semibold text-warning-soft-foreground">data loss</span>. Please move your data to a
        different folder.
      </Modal.Body>
    </TabModal>
  );
}

export default memo(LocateWarningModal);
