import {Button} from '@heroui/react';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {replaceSlashes} from '@lynx_common/utils';
import filesIpc from '@lynx_shared/ipc/files';
import {RestartIcon} from '@solar-icons/react/bold-duotone';
import {ReactNode, useCallback, useEffect, useMemo, useState} from 'react';

import {useGetArgumentsByID} from '../../../../../../../plugins/modules';
import {useCardsState} from '../../../../../../../redux/reducers/cards';
import {getArgumentDefaultValue} from '../../../../../../../utils/moduleArguments';
import LynxTooltip from '../../../../../../LynxTooltip';
import ArgumentItemBase from './Base';
import AutoCompletePath from './Path_AutoComplete';

type PathArgItemProps = {
  /** Type of the path: file or folder */
  type: 'file' | 'folder';
  /** Icon to display */
  icon: ReactNode;
  /** Placeholder text */
  placeholder: string;
  /** The argument data */
  argument: ChosenArgument;
  /** Function to remove the argument */
  removeArg: () => void;
  /** Function to change the argument value */
  changeValue: (value: any) => void;
  /** The ID of the card */
  id: string;
};

/**
 * Component for handling path arguments (files or folders).
 * Supports both absolute paths (via system dialog) and relative paths (via autocomplete).
 */
export default function PathArgItem({type, icon, placeholder, argument, changeValue, removeArg, id}: PathArgItemProps) {
  const installedCards = useCardsState('installedCards');
  const cardArgument = useGetArgumentsByID(id);

  const [selectedValue, setSelectedValue] = useState(
    argument.value || getArgumentDefaultValue(argument.name, cardArgument) || placeholder,
  );
  const [isRelative, setIsRelative] = useState<boolean>(false);
  const [rotateEffect, setRotateEffect] = useState<boolean>(false);

  const setPath = (value: string | undefined) => {
    if (!value) return;

    setSelectedValue(value);
    changeValue(value);
  };

  // Sync state with prop updates
  useEffect(() => {
    const val = argument.value || getArgumentDefaultValue(argument.name, cardArgument) || placeholder;
    setSelectedValue(val);
    if (argument.value) {
      filesIpc.isAbsolute(argument.value.toString()).then(isAbsolute => {
        setIsRelative(!isAbsolute);
      });
    } else {
      setIsRelative(false);
    }
  }, [argument.value, argument.name, cardArgument, placeholder]);

  const baseDir = useMemo(() => {
    return installedCards.find(card => card.id === id)?.dir;
  }, [installedCards, id]);

  const openDialog = useCallback(() => {
    if (!isRelative) {
      const properties: ('openFile' | 'openDirectory')[] = type === 'file' ? ['openFile'] : ['openDirectory'];
      filesIpc.openDlg({properties}).then(setPath);
    }
  }, [changeValue, isRelative, type]);

  const changePathType = useCallback(() => {
    setIsRelative(prevState => {
      // If switching modes and we have a valid path, try to convert it
      if (baseDir && selectedValue && selectedValue !== placeholder) {
        // If currently relative (prevState=true), we want absolute.
        // If currently absolute (prevState=false), we want relative.
        const method = prevState ? 'getAbsolutePath' : 'getRelativePath';
        filesIpc[method](baseDir, selectedValue).then(result => {
          const value = replaceSlashes(result);
          setSelectedValue(value);
          changeValue(value);
        });
      }
      return !prevState;
    });
    setRotateEffect(true);
  }, [baseDir, selectedValue, placeholder, changeValue]);

  return (
    <ArgumentItemBase
      extra={
        baseDir ? (
          <LynxTooltip delay={800} content={`Change to ${isRelative ? 'Absolute' : 'Relative'}`}>
            <Button size="sm" variant="ghost" onPress={changePathType} aria-label="Toggle path type" isIconOnly>
              <RestartIcon
                onAnimationEnd={() => setRotateEffect(false)}
                className={`${rotateEffect && 'animate-[spin_0.5s]'} size-3.5`}
              />
            </Button>
          </LynxTooltip>
        ) : undefined
      }
      id={id}
      icon={icon}
      onClick={openDialog}
      name={argument.name}
      removeArg={removeArg}
      defaultCursor={isRelative}>
      {isRelative ? (
        <AutoCompletePath
          type={type}
          baseDir={baseDir!}
          onValueChange={setPath}
          defaultValue={selectedValue !== placeholder ? selectedValue : undefined}
        />
      ) : (
        <span className="text-xs bg-surface-secondary py-2 px-3 rounded-2xl block truncate">{selectedValue}</span>
      )}
    </ArgumentItemBase>
  );
}
