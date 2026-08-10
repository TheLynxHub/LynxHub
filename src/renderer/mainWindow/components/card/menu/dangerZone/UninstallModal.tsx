import {Button, ButtonGroup, Modal} from '@heroui/react';
import filesIpc from '@lynx_shared/ipc/files';
import moduleIpc from '@lynx_shared/ipc/plugins/module';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {ShieldCrossIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useMemo} from 'react';
import {useDispatch} from 'react-redux';

import {topToast} from '../../../../layouts/ToastProviders';
import {extensionsData} from '../../../../plugins/extensions/loader';
import {useGetUninstallType} from '../../../../plugins/modules';
import {AppDispatch} from '../../../../redux/store';
import {useInstalledCard} from '../../../../utils/hooks';
import TabModal from '../../../TabModal';
import {useCardStore} from '../../store';
import {CommonProps} from '../about/types';

const UninstallDialog = memo(({state}: CommonProps) => {
  const id = useCardStore(st => st.id);

  const card = useInstalledCard(id);
  const dispatch = useDispatch<AppDispatch>();
  const uninstallType = useGetUninstallType(id);

  const uninstallHandle = useCallback(
    (type: 'removeDir' | 'trashDir') => {
      if (card) {
        state.close();

        const promise = new Promise<void>((resolve, reject) => {
          filesIpc[type](card.dir!)
            .then(() => {
              storageUtilsIpc.send.removeInstalledCard(id);
              resolve();
            })
            .catch(reject);
        });

        topToast.promise(promise, {
          loading: type === 'removeDir' ? 'Uninstalling...' : 'Moving to trash...',
          success: type === 'removeDir' ? 'Uninstalled successfully.' : 'Moved to trash successfully.',
          error:
            type === 'removeDir' ? 'An error occurred while uninstalling.' : 'An error occurred while moving to trash.',
        });
      }
    },
    [card, id, state, dispatch],
  );

  const remove = useCallback(() => uninstallHandle('removeDir'), [uninstallHandle]);
  const trash = useCallback(() => uninstallHandle('trashDir'), [uninstallHandle]);

  const uninstall = useCallback(() => {
    state.close();

    const promise = new Promise<void>((resolve, reject) => {
      moduleIpc
        .uninstallCardByID(id)
        .then(() => {
          storageUtilsIpc.send.removeInstalledCard(id);
          resolve();
        })
        .catch(reject);
    });

    topToast.promise(promise, {
      loading: 'Uninstalling...',
      success: 'Uninstalled successfully.',
      error: 'An error occurred while uninstalling.',
    });
  }, [id, state, dispatch]);

  return (
    <TabModal size="lg" isOpen={state.isOpen}>
      <Modal.Header>
        <Modal.Heading className="items-center gap-x-2 flex">
          <ShieldCrossIcon className="text-danger size-7" />
          <span className="text-danger">Confirm Uninstallation</span>
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <span>This action will remove the AI interface and all its associated data from your device.</span>
        <span className="font-semibold">Are you sure you want to proceed?</span>
      </Modal.Body>
      <Modal.Footer>
        <ButtonGroup size="sm" fullWidth>
          <Button className="flex-1" onPress={state.close}>
            Cancel
          </Button>
          {uninstallType === 'removeFolder' ? (
            <>
              <Button size="sm" onPress={trash} className="flex-1" variant="danger-soft">
                Move to Trash
              </Button>
              <Button size="sm" variant="danger" onPress={remove} className="flex-1">
                Delete Permanently
              </Button>
            </>
          ) : (
            <Button size="sm" variant="danger" className="flex-1" onPress={uninstall}>
              Uninstall
            </Button>
          )}
        </ButtonGroup>
      </Modal.Footer>
    </TabModal>
  );
});

const UninstallModal = ({state}: CommonProps) => {
  const Uninstall = useMemo(() => extensionsData.replaceModals.uninstallCard, []);

  if (!state.isOpen) return null;

  return Uninstall ? <Uninstall /> : <UninstallDialog state={state} />;
};

export default UninstallModal;
