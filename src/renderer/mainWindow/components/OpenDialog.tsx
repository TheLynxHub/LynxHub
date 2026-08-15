import {Button, ButtonGroup, FieldError, InputGroup, TextField} from '@heroui/react';
import {isWin} from '@lynx_common/utils';
import applicationIpc from '@lynx_shared/ipc/application';
import filesIpc from '@lynx_shared/ipc/files';
import {MoveToFolderIcon} from '@solar-icons/react/bold-duotone';
import {OpenDialogOptions} from 'electron';
import {useCallback, useEffect, useRef, useState} from 'react';

type Props = {
  /** Options for the electron open dialog */
  dialogType: OpenDialogOptions;
  /** Current directory path */
  directory: string;
  /** Callback to update the directory path */
  setDirectory: (directory: string) => void;
  /** Optional extra folder to append to the selected path */
  extraFolder?: string;
  /** Callback when validity status changes */
  onValidityChange?: (isValid: boolean) => void;
};

/**
 * Input field with a button to open a file/directory dialog.
 * Validates if the selected directory is empty or if it is the app folder.
 */
export default function OpenDialog({dialogType, directory, extraFolder = '', onValidityChange, setDirectory}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const validateDirectory = async () => {
      try {
        if (!directory) {
          setIsInvalid(true);
          setErrorMessage('Please specify a destination directory.');
          onValidityChange?.(false);
          return;
        }

        const isEmpty = await filesIpc.isEmptyDir(directory);
        if (!isMounted) return;

        if (!isEmpty) {
          setIsInvalid(true);
          setErrorMessage('Selected directory is not empty. Please choose an empty directory.');
          onValidityChange?.(false);
          return;
        }

        const isAppDir = await applicationIpc.invoke.isValidDataPath(directory);
        if (!isMounted) return;

        setIsInvalid(isAppDir);
        if (isAppDir) {
          setErrorMessage('Selecting the app folder can be dangerous and may lead to data loss.');
          onValidityChange?.(false);
        } else {
          setErrorMessage('');
          onValidityChange?.(true);
        }
      } catch (error) {
        console.error('Failed to validate directory:', error);
      }
    };

    void validateDirectory();

    return () => {
      isMounted = false;
    };
  }, [directory, onValidityChange]);

  const changeDirectory = useCallback(
    (value: string) => {
      if (value && inputRef.current) {
        setDirectory(value);
        inputRef.current.value = value;
      }
    },
    [setDirectory],
  );

  const chooseDirectory = useCallback(async () => {
    try {
      const result = await filesIpc.openDlg(dialogType);
      if (result && inputRef.current) {
        const resultDir = extraFolder ? `${result}${isWin ? '\\' : '/'}${extraFolder}` : result;
        setDirectory(resultDir);
        inputRef.current.value = resultDir;
      }
    } catch (error) {
      console.error('Failed to open dialog:', error);
    }
  }, [dialogType, extraFolder, setDirectory]);

  return (
    <ButtonGroup className="items-start" fullWidth>
      <TextField
        type="text"
        value={directory}
        className="w-full"
        isInvalid={isInvalid}
        defaultValue={directory}
        onChange={changeDirectory}>
        <InputGroup>
          <InputGroup.Input ref={inputRef} className="w-full " />
          <InputGroup.Suffix className="pr-1">
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onPress={chooseDirectory}
              aria-label="Choose directory"
              isIconOnly>
              <MoveToFolderIcon className="size-4" />
            </Button>
          </InputGroup.Suffix>
        </InputGroup>
        <FieldError>{errorMessage}</FieldError>
      </TextField>
    </ButtonGroup>
  );
}
