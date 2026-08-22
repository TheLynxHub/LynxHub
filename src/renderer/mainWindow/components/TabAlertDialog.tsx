import {AlertDialog, AlertDialogBackdropProps, AlertDialogContainerProps} from '@heroui/react';
import browserIpc from '@lynx_shared/ipc/browser';
import {MouseEvent, ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import {UNSAFE_PortalProvider} from 'react-aria';

import {useCurrentTabId} from '../layouts/tabs/TabContext';
import {useCardsState} from '../redux/reducers/cards';
import {useTabsState} from '../redux/reducers/tabs';

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
  const contextTabId = useCurrentTabId();
  const activeTab = useTabsState('activeTab');
  const runningCards = useCardsState('runningCard');

  const resolvedTabId = explicitTabId ?? contextTabId;

  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(false);
  const isControlled = typeof isOpen === 'boolean';
  const effectiveIsOpen = isControlled ? isOpen : uncontrolledOpen;

  const [targetContainer, setTargetContainer] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    return resolvedTabId ? document.getElementById(`${resolvedTabId}_wrapper`) : null;
  });

  const currentRunningCard = useMemo(
    () => runningCards.find(card => card.tabId === (resolvedTabId ?? activeTab)),
    [runningCards, resolvedTabId, activeTab],
  );

  useEffect(() => {
    if (!effectiveIsOpen) {
      setTargetContainer(null);
      return;
    }

    if (resolvedTabId) {
      setTargetContainer(document.getElementById(`${resolvedTabId}_wrapper`));
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
  );
}
