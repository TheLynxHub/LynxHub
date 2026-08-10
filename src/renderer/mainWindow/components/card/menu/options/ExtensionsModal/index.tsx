import {Button, Checkbox, Modal, Tabs} from '@heroui/react';
import {extractGitUrl} from '@lynx_common/utils';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer, {useDebounceBreadcrumb} from '@lynx_shared/sentry/Breadcrumbs';
import {DownloadIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {extensionsData} from '../../../../../plugins/extensions/loader';
import {useInstalledCard, useIsAutoUpdateExtensions} from '../../../../../utils/hooks';
import TabModal from '../../../../TabModal';
import {useCardStore} from '../../../store';
import {CommonProps} from '../../about/types';
import useAvailableExtensions from './available';
import Clone from './Clone';
import {useInstalledExtensions} from './hooks/useInstalledExtensions';
import Installed from './Installed';

const ExtensionsModalContent = ({state}: CommonProps) => {
  const id = useCardStore(st => st.id);
  const repoUrl = useCardStore(st => st.repoUrl);
  const extensionsDir = useCardStore(st => st.extensionsDir);
  const cardTitle = useCardStore(st => st.title);

  const card = useInstalledCard(id);

  const devName = extractGitUrl(repoUrl).owner;
  const dir = card ? `${card.dir}${extensionsDir}` : '';
  const title = `${cardTitle} (${devName}) Extensions`;

  const [currentTab, setCurrentTab] = useState<string | number>('installed');
  const autoUpdate = useIsAutoUpdateExtensions(id);

  const {
    extensions,
    installedUrls,
    updatesAvailable,
    isUpdatingAll,
    statusMap,
    isLoading,
    getExtensions,
    checkUpdates,
    deleteExtension,
    disableExtension,
    updateExtension,
    updateAll,
  } = useInstalledExtensions(dir);

  useDebounceBreadcrumb('Card Extension Modal: ', [state.isOpen, title]);
  useDebounceBreadcrumb('Card Extension Modal Tabs: ', [currentTab]);

  useEffect(() => {
    setCurrentTab('installed');
  }, [state.isOpen]);

  const onAutoUpdateChange = useCallback(() => {
    AddBreadcrumb_Renderer(
      `Card Menu Action: Clicked "auto-update-extensions" (to ${!autoUpdate ? 'enable' : 'disable'}) on "${cardTitle}"`,
    );
    if (autoUpdate) {
      storageUtilsIpc.send.removeAutoUpdateExtensions(id);
    } else {
      storageUtilsIpc.send.addAutoUpdateExtensions(id);
    }
  }, [autoUpdate, id, cardTitle]);

  const isUpdateAvailable = useMemo(() => {
    return !isEmpty(updatesAvailable);
  }, [updatesAvailable]);

  const isExtensionAvailable = useMemo(() => {
    return !isEmpty(extensions);
  }, [extensions]);

  const {Body, Footer} = useAvailableExtensions({
    id: id,
    dir: dir,
    updateTable: getExtensions,
    installedExtensions: installedUrls,
    visible: currentTab === 'available',
  });

  return (
    <TabModal size="lg" isOpen={state.isOpen} onOpenChange={state.setOpen} dialogClassName="w-4xl! max-w-4xl!">
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading className="flex-col gap-y-2 text-center">
          {title || 'Extensions'}

          <Tabs className="w-full mt-3" onSelectionChange={setCurrentTab} selectedKey={currentTab.toString()}>
            <Tabs.ListContainer>
              <Tabs.List>
                <Tabs.Tab id="installed" className="gap-x-1">
                  Installed
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="available" className="gap-x-1">
                  Available
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="clone" className="gap-x-1">
                  Clone
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body className="scrollbar-hide">
        <div className="relative h-fit">
          <Installed
            dir={dir}
            isOpen={state.isOpen}
            statusMap={statusMap}
            isLoading={isLoading}
            extensions={extensions}
            checkUpdates={checkUpdates}
            getExtensions={getExtensions}
            deleteExtension={deleteExtension}
            updateExtension={updateExtension}
            disableExtension={disableExtension}
            visible={currentTab === 'installed'}
          />
          <Clone
            dir={dir}
            updateTable={getExtensions}
            visible={currentTab === 'clone'}
            installedExtensions={installedUrls}
          />

          {Body}
        </div>
      </Modal.Body>

      <Modal.Footer>
        {currentTab !== 'available' && (
          <div className="flex w-full flex-row justify-between">
            <div>
              {currentTab === 'installed' && (
                <Checkbox
                  variant="secondary"
                  isSelected={autoUpdate}
                  onChange={onAutoUpdateChange}
                  isDisabled={!isExtensionAvailable}>
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    Auto Update on Launch
                  </Checkbox.Content>
                </Checkbox>
              )}
            </div>
            <div className="space-x-1.5">
              {currentTab === 'installed' && (
                <Button
                  onPress={updateAll}
                  isDisabled={!isUpdateAvailable || isUpdatingAll}
                  variant={isUpdateAvailable ? 'primary' : 'tertiary'}>
                  {isUpdateAvailable && !isUpdatingAll && <DownloadIcon />}
                  {!isUpdateAvailable ? 'No Updates Available' : isUpdatingAll ? 'Updating...' : 'Update All'}
                </Button>
              )}
            </div>
          </div>
        )}

        {currentTab === 'available' && <div className="flex w-full justify-center">{Footer}</div>}
      </Modal.Footer>
    </TabModal>
  );
};

const ExtensionsModal = ({state}: CommonProps) => {
  const CardExt = useMemo(() => extensionsData.replaceModals.cardExtensions, []);

  if (!state.isOpen) return null;

  return CardExt ? <CardExt /> : <ExtensionsModalContent state={state} />;
};

export default ExtensionsModal;
