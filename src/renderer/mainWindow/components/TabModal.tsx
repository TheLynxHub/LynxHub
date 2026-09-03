import {Modal, ModalBackdropProps, ModalContainerProps} from '@heroui/react';
import {MouseEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {UNSAFE_PortalProvider} from 'react-aria';

import {useCurrentTabId} from '../layouts/tabs/TabContext';

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

  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const handleBackdropMouseDown = useCallback((e: MouseEvent<HTMLElement>) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const mouseDownTarget = mouseDownTargetRef.current;
      mouseDownTargetRef.current = null;

      if (
        isDismissable &&
        mouseDownTarget instanceof HTMLElement &&
        mouseDownTarget.closest('.modal__backdrop, .modal__container') &&
        !mouseDownTarget.closest('.modal__dialog') &&
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
              onMouseDown={handleBackdropMouseDown}
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
            onMouseDown={handleBackdropMouseDown}
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
