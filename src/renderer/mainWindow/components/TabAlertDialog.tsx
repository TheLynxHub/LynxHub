import {AlertDialog, AlertDialogBackdropProps, AlertDialogContainerProps} from '@heroui/react';
import {MouseEvent, ReactNode, useCallback, useLayoutEffect, useRef, useState} from 'react';
import {UNSAFE_PortalProvider} from 'react-aria';

import {useCurrentTabId} from '../layouts/tabs/TabContext';

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

  useLayoutEffect(() => {
    if (anchorRef.current) {
      const wrapper = anchorRef.current.closest<HTMLElement>('[id$="_wrapper"]');
      if (wrapper?.id) {
        setDomTabId(wrapper.id.replace(/_wrapper$/, ''));
      }
    }
  }, []);

  const resolvedTabId = explicitTabId ?? contextTabId ?? domTabId;

  const isControlled = typeof isOpen === 'boolean';

  const getContainer = useCallback(() => {
    if (resolvedTabId) {
      const el = document.getElementById(`${resolvedTabId}_wrapper`);
      if (el) return el;
    }
    if (anchorRef.current) {
      const wrapper = anchorRef.current.closest<HTMLElement>('[id$="_wrapper"]');
      if (wrapper) return wrapper;
    }
    return document.body;
  }, [resolvedTabId]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange],
  );

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
        mouseDownTarget.closest('.alert-dialog__backdrop, .alert-dialog__container') &&
        !mouseDownTarget.closest('.alert-dialog__dialog') &&
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
        <UNSAFE_PortalProvider getContainer={getContainer}>
          <AlertDialog.Backdrop
            className="h-full"
            isDismissable={false}
            variant={backdropVariant}
            onClick={handleBackdropClick}
            onMouseDown={handleBackdropMouseDown}
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
      </AlertDialog>
    </>
  );
}
