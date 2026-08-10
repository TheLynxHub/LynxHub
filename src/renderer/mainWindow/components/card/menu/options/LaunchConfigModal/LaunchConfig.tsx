import {Button, Modal, ScrollShadow, Spinner, Tabs} from '@heroui/react';
import {ChosenArgumentsData} from '@lynx_common/types';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {useDebounceBreadcrumb} from '@lynx_shared/sentry/Breadcrumbs';
import {DisketteIcon} from '@solar-icons/react/bold-duotone';
import {Key, memo, useCallback, useEffect, useMemo, useState} from 'react';

import {topToast} from '../../../../../layouts/ToastProviders';
import TabModal from '../../../../TabModal';
import {useCardStore} from '../../../store';
import {CommonProps} from '../../about/types';
import CardArguments from './Arguments';
import CustomRun from './CustomRun';
import CardPreLaunch from './PreLaunch';

const tabs = {
  arguments: 'arguments',
  customRun: 'custom-run',
  preLaunch: 'preLaunch',
};

const LaunchConfig = memo(({state}: CommonProps) => {
  const id = useCardStore(st => st.id);
  const haveArguments = useCardStore(st => st.haveArguments);
  const cardTitle = useCardStore(st => st.title);

  const title = useMemo(() => `${cardTitle} Launch Config`, [cardTitle]);

  const [isSavingArgs, setIsSavingArgs] = useState<boolean>(false);
  const [chosenArguments, setChosenArguments] = useState<ChosenArgumentsData>({activePreset: '', data: []});
  const [currentTab, setCurrentTab] = useState<Key>(haveArguments ? tabs.arguments : tabs.customRun);

  useDebounceBreadcrumb('Card Launch Config Modal: ', [state.isOpen, title]);
  useDebounceBreadcrumb('Card Launch Config Tabs Modal: ', [currentTab]);

  useEffect(() => {
    setCurrentTab(haveArguments ? tabs.arguments : tabs.customRun);
  }, [state.isOpen, haveArguments]);

  const saveArguments = useCallback(() => {
    setIsSavingArgs(true);
    const fakeDelay = 300;
    storageUtilsIpc.invoke
      .setCardArguments(id, chosenArguments)
      .then(() => {
        setTimeout(() => {
          topToast.success('Preset and arguments saved successfully.');
        }, fakeDelay);
      })
      .catch(() => {
        setTimeout(() => {
          topToast.danger('An error occurred while saving the preset and arguments.');
        }, fakeDelay);
      })
      .finally(() => {
        setTimeout(() => {
          setIsSavingArgs(false);
        }, fakeDelay);
      });
  }, [id, chosenArguments]);

  return (
    <TabModal dialogClassName="p-0" isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <Modal.CloseTrigger />
      <Modal.Header className="px-6 pt-6">
        <Modal.Heading className="flex-col gap-y-2 pb-0 text-center">
          {title || 'Launch Config'}

          <Tabs className="w-full my-3" onSelectionChange={setCurrentTab} selectedKey={currentTab.toString()}>
            <Tabs.ListContainer>
              <Tabs.List aria-label="Options">
                {haveArguments && (
                  <Tabs.Tab id={tabs.arguments}>
                    Arguments
                    <Tabs.Indicator />
                  </Tabs.Tab>
                )}
                <Tabs.Tab id={tabs.customRun}>
                  Custom Run
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id={tabs.preLaunch}>
                  Pre Launch
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body className="overflow-hidden">
        <ScrollShadow className="size-full px-6 pt-2 pb-6">
          {haveArguments && currentTab === tabs.arguments && (
            <CardArguments id={id} chosenArguments={chosenArguments} setChosenArguments={setChosenArguments} />
          )}
          {currentTab === tabs.customRun && <CustomRun id={id} />}
          {currentTab === tabs.preLaunch && <CardPreLaunch id={id} />}
        </ScrollShadow>
      </Modal.Body>

      {currentTab === tabs.arguments && (
        <Modal.Footer className="px-6 pb-4">
          <Button onPress={saveArguments} isPending={isSavingArgs}>
            {isSavingArgs ? <Spinner size="sm" color="current" /> : <DisketteIcon className="size-4" />}
            {isSavingArgs ? 'Saving...' : 'Save Arguments'}
          </Button>
        </Modal.Footer>
      )}
    </TabModal>
  );
});

export default LaunchConfig;
