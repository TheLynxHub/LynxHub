import {AlertDialog, AlertDialogBackdropProps, AlertDialogContainerProps} from '@heroui/react';
import browserIpc from '@lynx_shared/ipc/browser';
import {MouseEvent, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {UNSAFE_PortalProvider} from 'react-aria';

import {useCurrentTabId} from '../layouts/tabs/TabContext';
import {useCardsState} from '../redux/reducers/cards';

type Props = {
  children: ReactNode;
  trigger?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: ((isOpen: boolean) => void) | undefined;
  size?: AlertDialogContainerProps['size'];
  placement?: AlertDialogContainerProps['placement'];
  isDismissable?: boolean;
  backdropVariant?: AlertDialogBackdropProps['variant'];
  dialogClassName?: string;
  containerClassName?: string;
  isKeyboardDismissDisabled?: boolean;
  tabId?: string;
};

export default function TabAlertDialog({
  trigger,
  isOpen,
  onOpenChange,
  children,
  size = 'md',
  placement,
  isDismissable = false,
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

  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(false);
  const isControlled = typeof isOpen === 'boolean';
  const effectiveIsOpen = isControlled ? isOpen : uncontrolledOpen;

  const [targetContainer, setTargetContainer] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    return resolvedTabId ? document.getElementById(`${resolvedTabId}_wrapper`) : null;
  });

  const currentRunningCard = useMemo(
    () => (resolvedTabId ? runningCards.find(card => card.tabId === resolvedTabId) : undefined),
    [runningCards, resolvedTabId],
  );

  useEffect(() => {
    if (!effectiveIsOpen) {
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
  }, [effectiveIsOpen, resolvedTabId]);

  useEffect(() => {
    if (effectiveIsOpen && currentRunningCard && currentRunningCard.currentView === 'browser') {
      browserIpc.send.setVisible(currentRunningCard.id, false);
      return () => {
        browserIpc.send.setVisible(currentRunningCard.id, true);
      };
    }
    return undefined;
  }, [effectiveIsOpen, currentRunningCard]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(open);
      }
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange],
  );

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (
        isDismissable &&
        e.target instanceof HTMLElement &&
        e.target.closest('.alert-dialog__backdrop, .alert-dialog__container') &&
        !e.target.closest('.alert-dialog__dialog')
      ) {
        handleOpenChange(false);
      }
    },
    [isDismissable, handleOpenChange],
  );

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      <AlertDialog isOpen={isOpen} onOpenChange={handleOpenChange}>
        {trigger}
        {targetContainer ? (
          <UNSAFE_PortalProvider getContainer={() => targetContainer}>
            <AlertDialog.Backdrop
              className="h-full"
              isDismissable={false}
              variant={backdropVariant}
              onClick={handleBackdropClick}
              isKeyboardDismissDisabled={isKeyboardDismissDisabled}>
              <AlertDialog.Container
                size={size}
                placement={placement}
                className={containerClassName ? `h-full max-h-full ${containerClassName}` : 'h-full max-h-full'}>
                <AlertDialog.Dialog
                  className={
                    size === 'cover'
                      ? dialogClassName
                        ? `h-full max-h-full ${dialogClassName}`
                        : 'h-full max-h-full'
                      : dialogClassName
                  }>
                  <UNSAFE_PortalProvider getContainer={() => document.body}>{children}</UNSAFE_PortalProvider>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </UNSAFE_PortalProvider>
        ) : (
          <AlertDialog.Backdrop
            className="h-full"
            isDismissable={false}
            variant={backdropVariant}
            onClick={handleBackdropClick}
            isKeyboardDismissDisabled={isKeyboardDismissDisabled}>
            <AlertDialog.Container
              size={size}
              placement={placement}
              className={containerClassName ? `h-full max-h-full ${containerClassName}` : 'h-full max-h-full'}>
              <AlertDialog.Dialog
                className={
                  size === 'cover'
                    ? dialogClassName
                      ? `h-full max-h-full ${dialogClassName}`
                      : 'h-full max-h-full'
                    : dialogClassName
                }>
                {children}
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        )}
      </AlertDialog>
    </>
  );
}
