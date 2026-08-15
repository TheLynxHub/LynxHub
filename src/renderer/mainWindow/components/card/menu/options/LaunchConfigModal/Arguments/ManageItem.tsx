import {ChosenArgumentsData} from '@lynx_common/types';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import {Dispatch, memo, SetStateAction, useCallback, useMemo} from 'react';

import {useGetArgumentsByID} from '../../../../../../plugins/modules';
import {getArgumentType} from '../../../../../../utils/moduleArguments';
import CheckBoxArgItem from './ArgumentItems/CheckBox';
import DeprecatedArgItem from './ArgumentItems/Deprecated';
import DirectoryArgItem from './ArgumentItems/Directory';
import DropdownArgItem from './ArgumentItems/Dropdown';
import FileArgItem from './ArgumentItems/File';
import InputArgItem from './ArgumentItems/Input';
import NumberArgItem from './ArgumentItems/Number';

type Props = {
  argument: ChosenArgument;
  setArguments: Dispatch<SetStateAction<ChosenArgumentsData>>;
  id: string;
};

/**
 * Display the argument manager element based on the argument type: DropDown, Input, Directory, etc.
 */
const ManageArgumentsItem = memo(({argument, setArguments, id}: Props) => {
  const cardArgument = useGetArgumentsByID(id);

  const removeArg = useCallback(() => {
    setArguments((prevState: ChosenArgumentsData): ChosenArgumentsData => {
      const data = prevState.data.map(arg => {
        if (arg.preset === prevState.activePreset) {
          return {
            ...arg,
            arguments: arg.arguments.filter(a => a.name !== argument.name),
          };
        }
        return arg;
      });
      return {...prevState, data: [...data]};
    });
  }, [setArguments, argument.name]);

  const changeValue = useCallback(
    (value: any) => {
      setArguments((prevState: ChosenArgumentsData): ChosenArgumentsData => {
        const data = prevState.data.map(arg => {
          if (arg.preset === prevState.activePreset) {
            return {
              ...arg,
              arguments: arg.arguments.map(a => (a.name === argument.name ? {...a, value} : a)),
            };
          }
          return arg;
        });
        return {...prevState, data};
      });
    },
    [setArguments, argument.name],
  );

  const Component = useMemo(() => {
    const type = argument.custom?.type || getArgumentType(argument.name, cardArgument);
    switch (type) {
      case 'Directory':
        return DirectoryArgItem;
      case 'File':
        return FileArgItem;
      case 'Input':
        return InputArgItem;
      case 'Number':
        return NumberArgItem;
      case 'DropDown':
        return DropdownArgItem;
      case 'CheckBox':
        return CheckBoxArgItem;
      default:
        return DeprecatedArgItem;
    }
  }, [argument.name, cardArgument]);

  return <Component id={id} argument={argument} removeArg={removeArg} changeValue={changeValue} />;
});

export default ManageArgumentsItem;
