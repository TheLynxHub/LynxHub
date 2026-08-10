import {Button, Checkbox, Modal} from '@heroui/react';
import {APP_AUTHOR_NAME} from '@lynx_common/consts';
import {ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import TabModal from '../../components/TabModal';

/**
 * Props for the SecurityWarning component.
 */
interface SecurityWarningProps {
  /** Controls if the security warning modal is open. */
  isOpen: boolean;
  /** State setter to update the modal's open state. */
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  /** The type of plugin taking action (extension or module). */
  type: 'extension' | 'module';
  /** Callback fired when the user agrees to the warning or bypasses it. */
  onAgree: () => void;
  /** The title of the extension/module being installed. */
  title?: string;
  /** The owner or author of the extension/module. */
  owner?: string;
}

/**
 * Modal component that warns users about installing third-party plugins.
 * Users can agree and choose to not show this notice again for specific types.
 */
export default function SecurityWarning({isOpen, onAgree, setIsOpen, type, title, owner}: SecurityWarningProps) {
  const storeKey = useMemo(() => `dont_show-${type}-security_notice`, [type]);
  const [dontShow, setDontShow] = useState<boolean>(false);

  // Use a ref to store the latest onAgree callback to prevent unnecessary effect triggers
  const onAgreeRef = useRef(onAgree);
  useEffect(() => {
    onAgreeRef.current = onAgree;
  }, [onAgree]);

  /**
   * Check if we should automatically bypass the warning if:
   *  - The author is the app's official author.
   *  - The user has previously decided not to show warnings for this type.
   */
  useEffect(() => {
    if (isOpen) {
      const savedDontShow = window.localStorage.getItem(storeKey);
      const isOfficialAuthor = owner?.toLowerCase() === APP_AUTHOR_NAME.toLowerCase();
      const userOptedOut = savedDontShow === 'true';

      if (isOfficialAuthor || userOptedOut) {
        setIsOpen(false);
        onAgreeRef.current();
      }
    }
  }, [isOpen, storeKey, owner, setIsOpen]);

  const handleAgree = useCallback(() => {
    if (dontShow) {
      window.localStorage.setItem(storeKey, 'true');
    }
    setIsOpen(false);
    onAgreeRef.current();
  }, [dontShow, storeKey, setIsOpen]);

  const handleDecline = useCallback(() => {
    setIsOpen(false);
    setDontShow(false);
  }, [setIsOpen]);

  return (
    <TabModal size="lg" isOpen={isOpen} onOpenChange={setIsOpen} dialogClassName="max-w-160!">
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading className="justify-center text-warning items-center gap-x-2 flex-row flex">
          <ShieldWarningIcon className="size-7" />
          <span>Security Notice</span>
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body className="pt-4 scrollbar-hide flex flex-col gap-y-2 text-sm">
        <p className="font-semibold text-success">
          LynxHub grants plugins full access, similar to standalone applications, to maximize their potential.
        </p>
        <p>
          <p className="text-muted">
            When a plugin is initially submitted, its code is reviewed for security and potential vulnerabilities.
            <br />
            However, after the initial review, plugins can update their functionality with commits, and developers can
            add any code they want.
          </p>
          <p className="text-muted">
            Please exercise caution and only install trusted plugins. LynxHub is not responsible for vulnerabilities
            that may arise after the initial review and subsequent updates.
          </p>
        </p>
        <p className="text-warning">
          By clicking <span className="font-semibold text-accent">Agree</span>, you acknowledge and accept the potential
          security implications of installing
          <span className="font-semibold">{` "${title}" by "${owner}"`}</span>.
        </p>

        <Checkbox className="mt-4" variant="secondary" isSelected={dontShow} onChange={setDontShow}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Do not show this warning again
          </Checkbox.Content>
        </Checkbox>
      </Modal.Body>

      <Modal.Footer>
        <div className="flex gap-x-2">
          <Button size="sm" variant="danger-soft" onPress={handleDecline}>
            Decline
          </Button>
          <Button size="sm" variant="primary" onPress={handleAgree}>
            Agree
          </Button>
        </div>
      </Modal.Footer>
    </TabModal>
  );
}
