import {Modal, ModalBackdropProps, ModalContainerProps} from '@heroui/react';
import browserIpc from '@lynx_shared/ipc/browser';
import {MouseEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {UNSAFE_PortalProvider} from 'react-aria';

import {useCurrentTabId} from '../layouts/tabs/TabContext';
import {useCardsState} from '../redux/reducers/cards';

type Props = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange?: ((isOpen: boolean) => void) | undefined;
  size?: ModalContainerProps['size'];
  isDismissable?: boolean;
  backdropVariant?: ModalBackdropProps['variant'];
  dialogClassName?: string;
  containerClassName?: string;
  isKeyboardDismissDisabled?: boolean;
  tabId?: string;
};

export default function TabModal({
  isOpen,
  onOpenChange,
  children,
  size = 'cover',
  isDismissable = true,
  backdropVariant,
  dialogClassName,
  containerClassName,
  isKeyboardDismissDisabled,
  tabId: explicitTabId,
}: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const contextTabId = useCurrentTabId();
  const [domTabId, setDomTabId] = useState<string | undefined>(undefined);
  const runningCards = useCardsState('runningCard');

  useLayoutEffect(() => {
    if (anchorRef.current) {
      const wrapper = anchorRef.current.closest<HTMLElement>('[id$="_wrapper"]');
      if (wrapper?.id) {
        setDomTabId(wrapper.id.replace(/_wrapper$/, ''));
      }
    }
  }, []);

  const resolvedTabId = explicitTabId ?? contextTabId ?? domTabId;

  const [targetContainer, setTargetContainer] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    return resolvedTabId ? document.getElementById(`${resolvedTabId}_wrapper`) : null;
  });

  const currentRunningCard = useMemo(
    () => (resolvedTabId ? runningCards.find(card => card.tabId === resolvedTabId) : undefined),
    [runningCards, resolvedTabId],
  );

  useEffect(() => {
    if (!isOpen) {
      setTargetContainer(null);
      return;
    }

    if (resolvedTabId) {
      setTargetContainer(document.getElementById(`${resolvedTabId}_wrapper`));
    } else if (anchorRef.current) {
      const wrapper = anchorRef.current.closest<HTMLElement>('[id$="_wrapper"]');
      setTargetContainer(wrapper ?? null);
    } else {
      setTargetContainer(null);
    }
  }, [isOpen, resolvedTabId]);

  useEffect(() => {
    if (isOpen && currentRunningCard && currentRunningCard.currentView === 'browser') {
      browserIpc.send.setVisible(currentRunningCard.id, false);
      return () => {
        browserIpc.send.setVisible(currentRunningCard.id, true);
      };
    }
    return undefined;
  }, [isOpen, currentRunningCard]);

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (
        isDismissable &&
        e.target instanceof HTMLElement &&
        e.target.closest('.modal__backdrop, .modal__container') &&
        !e.target.closest('.modal__dialog')
      ) {
        onOpenChange?.(false);
      }
    },
    [isDismissable, onOpenChange],
  );

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        {targetContainer ? (
          <UNSAFE_PortalProvider getContainer={() => targetContainer}>
            <Modal.Backdrop
              className="h-full"
              isDismissable={false}
              variant={backdropVariant}
              onClick={handleBackdropClick}
              isKeyboardDismissDisabled={isKeyboardDismissDisabled}>
              <Modal.Container size={size} scroll="inside" className={`h-full max-h-full ${containerClassName}`}>
                <Modal.Dialog className={size === 'cover' ? `h-full max-h-full ${dialogClassName}` : dialogClassName}>
                  <UNSAFE_PortalProvider getContainer={() => document.body}>{children}</UNSAFE_PortalProvider>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </UNSAFE_PortalProvider>
        ) : (
          <Modal.Backdrop
            className="h-full"
            isDismissable={false}
            variant={backdropVariant}
            onClick={handleBackdropClick}
            isKeyboardDismissDisabled={isKeyboardDismissDisabled}>
            <Modal.Container size={size} scroll="inside" className={`h-full max-h-full ${containerClassName}`}>
              <Modal.Dialog className={size === 'cover' ? `h-full max-h-full ${dialogClassName}` : dialogClassName}>
                {children}
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        )}
      </Modal>
    </>
  );
}
