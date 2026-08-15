import {Button, Modal} from '@heroui/react';
import {ISSUE_PAGE} from '@lynx_common/consts';
import {SquareTopDownIcon} from '@solar-icons/react/bold-duotone';
import {memo, useMemo} from 'react';

import {extensionsData} from '../../../../../../../plugins/extensions/loader';
import TabModal from '../../../../../../TabModal';
import {CommonProps} from '../../../../about/types';

/**
 * Modal dialog displayed when git repository cloning fails.
 */
const DefaultCloneWarningModal = ({state}: CommonProps) => {
  return (
    <TabModal size="lg" isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>
          <p className="font-semibold">Unable to clone repository.</p>
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <p className="mt-4 font-semibold">Please ensure you have a stable internet connection and try again.</p>
        <p className="text-sm text-muted">If the issue persists, it could be due to one of the following reasons:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>The directory is empty and you have the necessary permissions to access it.</li>
          <li>The repository is too large, and your network is unable to handle the file transfer.</li>
          <li>Firewalls or proxy settings are blocking the connection.</li>
        </ul>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onPress={() => window.open(ISSUE_PAGE)}>
          Report
          <SquareTopDownIcon />
        </Button>
      </Modal.Footer>
    </TabModal>
  );
};

function CloneWarningModal({state}: CommonProps) {
  const ReplaceWarning = useMemo(() => extensionsData.replaceModals.warning, []);

  if (!state.isOpen) return null;

  return ReplaceWarning ? <ReplaceWarning /> : <DefaultCloneWarningModal state={state} />;
}

export default memo(CloneWarningModal);
