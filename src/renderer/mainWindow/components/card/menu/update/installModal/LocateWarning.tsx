import {Modal} from '@heroui/react';
import {ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {Dispatch, SetStateAction} from 'react';

import TabModal from '../../../../TabModal';

export interface LocateWarningProps {
  /** Enables or disables the visibility of the modal. */
  isOpen: boolean;
  /** Sets the state of the modal's visibility. */
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * A warning modal displayed when a user attempts to select the application's installation directory for data storage.
 * It prevents accidental data loss by warning the user to select another directory.
 *
 * @param {LocateWarningProps} props - The component props.
 */
export default function LocateWarning({isOpen, setIsOpen}: LocateWarningProps) {
  const onClose = () => setIsOpen(false);

  return (
    <TabModal size="sm" isOpen={isOpen}>
      <Modal.CloseTrigger onPress={onClose} />
      <Modal.Header>
        <Modal.Heading className="text-warning-soft-foreground items-center gap-x-2 flex flex-row">
          <ShieldWarningIcon className="size-8" />
          <span className="font-bold">Installation Directory</span>
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body>
        Saving data to an application's installation directory can result in{' '}
        <span className="text-warning-soft-foreground font-semibold">data loss</span>. Please move your data to a
        different folder.
      </Modal.Body>
    </TabModal>
  );
}
