import {Checkbox} from '@heroui/react';
import {ConfirmMenuTypes} from '@lynx_common/types';
import storageIpc, {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {memo, ReactNode, useEffect, useState} from 'react';

/**
 * Props for the ConfirmElement component.
 */
interface ConfirmElementProps {
  /** The title of the confirmation dialog */
  title: string;
  /** The label for the "don't show again" checkbox */
  enabledTitle: string;
  /** The key in the app config for the confirmation setting */
  confirmName: ConfirmMenuTypes;
  /** The action buttons to display */
  buttons: ReactNode;
}

/**
 * A reusable component for confirmation dialogs with a "don't show again" option.
 */
const ConfirmElement = memo(({title, enabledTitle, confirmName, buttons}: ConfirmElementProps) => {
  const [isSkipConfirmSelected, setIsSkipConfirmSelected] = useState<boolean>(false);

  const onToggleSkipConfirm = (isSelected: boolean) => {
    // If selected (true), we want to disable confirmation (false)
    storageUtilsIpc.send.setShowConfirm(confirmName, !isSelected);
    setIsSkipConfirmSelected(isSelected);
  };

  useEffect(() => {
    let isMounted = true;

    storageIpc.get('app').then(appConfig => {
      if (isMounted) {
        // appConfig[confirmName] is true if confirmation is enabled.
        // So if it's true, skip confirmation is false.
        setIsSkipConfirmSelected(!appConfig[confirmName]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [confirmName]);

  return (
    <div className="py-4 px-5 w-90">
      <div className="flex flex-row items-center justify-start gap-x-2">
        <ShieldWarningIcon className="text-danger size-7" />
        <span className="text-base font-semibold">{title}</span>
      </div>

      <Checkbox className="my-3" variant="secondary" onChange={onToggleSkipConfirm} isSelected={isSkipConfirmSelected}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          {enabledTitle}
        </Checkbox.Content>
      </Checkbox>

      <div className="flex w-full flex-row justify-between">{buttons}</div>
    </div>
  );
});

export default ConfirmElement;
