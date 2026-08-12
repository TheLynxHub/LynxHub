import ptyIpc from '@lynx_shared/ipc/pty';
import utilsIpc from '@lynx_shared/ipc/utils';
import {memo, useCallback, useEffect, useMemo, useRef} from 'react';
import {useDispatch} from 'react-redux';

import {extensionsData} from '../../../../../plugins/extensions/loader';
import {getCardMethod, useAllCardMethods} from '../../../../../plugins/modules';
import {cardsActions} from '../../../../../redux/reducers/cards';
import {AppDispatch} from '../../../../../redux/store';
import {useInstalledCard} from '../../../../../utils/hooks';
import TabModal from '../../../../TabModal';
import {XTermAPI} from '../../../../useXTerm';
import {useCardStore} from '../../../store';
import {CommonProps} from '../../about/types';
import InstallBody from './Body';
import InstallFooter from './Footer';
import InstallHeader from './Header';
import {useStepper} from './Hooks';
import {useInstallStore} from './store';

type Props = {type: 'install' | 'update'} & CommonProps;

/**
 * The main container mapping Redux, IPC callbacks, and `useInstallStore` to construct the
 * installation wizard for LynxHub extensions and cards.
 * Combines the Header, Body, and Footer layout blocks.
 *
 * @param {Props} props - The component props.
 */
const InstallModal = memo(({state: modalState, type}: Props) => {
  const cardId = useCardStore(st => st.id);
  const installedCard = useInstalledCard(cardId);
  const allMethods = useAllCardMethods();
  const dispatch = useDispatch<AppDispatch>();

  const bodyState = useInstallStore(s => s.body);
  const doneAll = useInstallStore(s => s.doneAll);
  const resetStore = useInstallStore(s => s.resetStore);
  const initializeStore = useInstallStore(s => s.initializeStore);

  const methods = useMemo(() => getCardMethod(allMethods, cardId, 'manager'), [cardId, allMethods]);

  const stepper = useStepper({cardId});
  const initializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const currentKey = `${cardId}:${type}`;
    if (modalState.isOpen) {
      if (initializedKeyRef.current !== currentKey) {
        initializedKeyRef.current = currentKey;
        initializeStore(cardId, type);
        if (methods) {
          if (type === 'install') {
            methods.startInstall(stepper);
          } else {
            methods.updater.startUpdate?.(stepper, installedCard?.dir);
          }
        }
      }
    } else {
      if (initializedKeyRef.current !== null) {
        initializedKeyRef.current = null;
        resetStore();
      }
    }
  }, [modalState.isOpen, methods, stepper, type, cardId, installedCard?.dir, initializeStore, resetStore]);

  useEffect(() => {
    if (bodyState === 'done' && doneAll.type === 'success' && type === 'update') {
      dispatch(cardsActions.removeUpdateAvailable(cardId));
    }
  }, [bodyState, doneAll.type, type, cardId, dispatch]);

  const handleClose = useCallback(() => {
    const currentBody = useInstallStore.getState().body;
    if (currentBody === 'terminal') ptyIpc.stop(cardId);
    if (currentBody === 'progress') {
      utilsIpc.cancelDownload();
    }
    resetStore();
    modalState.close();
  }, [cardId, modalState, resetStore]);

  const xtermRef = useRef<XTermAPI | null>(null);

  return (
    <TabModal
      containerClassName={`${
        bodyState === 'terminal' ? 'max-w-full! w-full! h-full! max-w-4xl!' : 'w-fit! h-fit! max-w-4xl!'
      }`}
      dialogClassName={`${
        bodyState === 'terminal' ? 'h-full! w-full! min-w-3xl! max-w-7xl!' : 'h-fit! max-h-full! w-fit! min-w-3xl!'
      }`}
      isDismissable={false}
      backdropVariant="blur"
      isOpen={modalState.isOpen}
      onOpenChange={modalState.setOpen}>
      <InstallHeader />
      <InstallBody xtermRef={xtermRef} isOpen={modalState.isOpen} />
      <InstallFooter stepper={stepper} xtermRef={xtermRef} handleClose={handleClose} />
    </TabModal>
  );
});

const InstallCardModal = ({state, type}: Props) => {
  const InstallUI = useMemo(() => extensionsData.replaceModals.installUi, []);

  if (!state.isOpen) return null;

  return InstallUI ? <InstallUI /> : <InstallModal type={type} state={state} />;
};

export default InstallCardModal;
