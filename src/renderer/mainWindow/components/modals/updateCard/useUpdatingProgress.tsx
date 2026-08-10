import {UseOverlayStateReturn} from '@heroui/react';
import gitIpc from '@lynx_shared/ipc/git';
import {DocumentsIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {LucideReplace, Minus, Plus} from 'lucide-react';
import {useEffect} from 'react';
import {useDispatch} from 'react-redux';
import {PullResult} from 'simple-git';

import {bottomToast} from '../../../layouts/ToastProviders';
import {cardsActions, useCardsState} from '../../../redux/reducers/cards';
import {AppDispatch} from '../../../redux/store';

/**
 * Hook to listen for git update progress and show notifications.
 */
export function useUpdatingProgress(
  modalState: UseOverlayStateReturn,
  setTitle: (title: string) => void,
  setDetails: (details: PullResult) => void,
) {
  const updatingCards = useCardsState('updatingCards');
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (isEmpty(updatingCards)) return;

    const removeListener = gitIpc.onProgress((id, state, progress) => {
      if (!id) return;

      const card = updatingCards.find(value => value.id === id);
      if (!card) return;

      if (state === 'Failed') {
        bottomToast.danger(<span className="whitespace-pre-line">Failed to Update {card.title}</span>, {
          description:
            typeof progress === 'string' ? <span className="whitespace-pre-line">{progress}</span> : undefined,
        });

        dispatch(cardsActions.removeUpdatingCard(card.id));
      } else if (state === 'Completed' && progress) {
        const {
          summary: {changes, insertions, deletions},
        } = progress as PullResult;

        const toastID = bottomToast.success(
          <span className="whitespace-pre-line">{card.title} Updated Successfully.</span>,
          {
            timeout: 0,
            description: (
              <div className="flex items-center gap-x-3 mt-1.5 text-xs text-muted">
                <div className="flex items-center gap-x-1">
                  <Plus className="size-3.5 text-success" />
                  <span className="font-semibold text-success">{insertions}</span>
                  <span className="text-muted-foreground/80">insertions</span>
                </div>
                <span className="text-muted-foreground/30 font-light">|</span>
                <div className="flex items-center gap-x-1">
                  <Minus className="size-3.5 text-danger" />
                  <span className="font-semibold text-danger">{deletions}</span>
                  <span className="text-muted-foreground/80">deletions</span>
                </div>
                <span className="text-muted-foreground/30 font-light">|</span>
                <div className="flex items-center gap-x-1">
                  <LucideReplace className="size-3.5 text-accent" />
                  <span className="font-semibold text-accent">{changes}</span>
                  <span className="text-muted-foreground/80">changes</span>
                </div>
              </div>
            ),
            actionProps: {
              variant: 'secondary',
              size: 'sm',
              className: 'self-center',
              children: (
                <div className="flex items-center gap-x-1">
                  <DocumentsIcon size={14} />
                  <span>Details</span>
                </div>
              ),
              onPress: () => {
                if ('summary' in progress) {
                  setDetails(progress);
                  setTitle(`${card.title} (${card.devName}) Update Details.`);
                  modalState.open();
                  if (toastID) bottomToast.close(toastID);
                }
              },
            },
          },
        );
        dispatch(cardsActions.removeUpdatingCard(card.id));
        dispatch(cardsActions.removeUpdateAvailable(card.id));
      }
    });

    return () => removeListener();
  }, [updatingCards, dispatch]);
}
