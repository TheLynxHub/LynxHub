import {useOverlayState} from '@heroui/react';
import {ChosenArgumentsData} from '@lynx_common/types';
import {ParsedPreview} from '@lynx_common/types/plugins/modules';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {motion} from 'framer-motion';
import {Dispatch, SetStateAction, useEffect, useMemo, useState} from 'react';

import {getCardMethod, useAllCardMethods} from '../../../../../../plugins/modules';
import {tabContentVariants} from '../../ExtensionsModal/Constants';
import AddArgumentModal from './Add';
import ArgumentsList from './Manage';
import PresetSelector from './ManagePresets';
import ArgumentsPreview from './Preview';

type Props = {
  setChosenArguments: Dispatch<SetStateAction<ChosenArgumentsData>>;
  chosenArguments: ChosenArgumentsData;
  id: string;
};

/**
 * Manage card arguments: add, edit, or remove.
 * Orchestrates presets, argument list, adding new arguments, and preview.
 */
export default function ArgumentsManager({chosenArguments, setChosenArguments, id}: Props) {
  const [previewData, setPreviewData] = useState<ParsedPreview>('');

  const addArgumentsModal = useOverlayState();
  const allMethods = useAllCardMethods();

  // Load initial arguments
  useEffect(() => {
    storageUtilsIpc.invoke
      .getCardArguments(id)
      .then(result => {
        setChosenArguments(result);
      })
      .catch(e => {
        console.error(`Failed get card arguments for ${id}: `, e);
      });
  }, [id, setChosenArguments]);

  // Derive active preset from chosenArguments
  const activePreset = useMemo(
    () =>
      chosenArguments.data.find(data => data.preset === chosenArguments.activePreset) || {
        arguments: [],
        preset: 'Default',
      },
    [chosenArguments.data, chosenArguments.activePreset],
  );

  // Derive presets list
  const presets = useMemo(() => chosenArguments.data.map(arg => arg.preset), [chosenArguments.data]);

  // Update preview data when arguments or method changes
  useEffect(() => {
    const getParsedArgs = getCardMethod(allMethods, id, 'parseArgsToString');
    if (getParsedArgs) {
      setPreviewData(getParsedArgs(activePreset.arguments));
    }
  }, [activePreset.arguments, id, allMethods]);

  return (
    <motion.div initial="init" animate="animate" className="space-y-5" variants={tabContentVariants}>
      <PresetSelector presets={presets} chosenArguments={chosenArguments} setChosenArguments={setChosenArguments} />
      <ArgumentsList
        id={id}
        chosenArguments={activePreset}
        addArgumentsModal={addArgumentsModal}
        setChosenArguments={setChosenArguments}
      />
      <ArgumentsPreview preview={previewData} />
      <AddArgumentModal
        id={id}
        chosenArguments={chosenArguments}
        addArgumentsModal={addArgumentsModal}
        setChosenArguments={setChosenArguments}
      />
    </motion.div>
  );
}
