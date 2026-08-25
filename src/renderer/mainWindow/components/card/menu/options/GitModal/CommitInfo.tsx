import {Button, Description, Modal, Spinner} from '@heroui/react';
import {RepositoryInfo} from '@lynx_common/types';
import {CommitItem} from '@lynx_common/types/git';
import gitIpc from '@lynx_shared/ipc/git';
import {Copy, ExternalLink, History} from 'lucide-react';
import {memo, useCallback, useEffect, useState} from 'react';

import {topToast} from '../../../../../layouts/ToastProviders';
import DescriptionGrid, {DescriptionGridItem} from '../../../../DescriptionGrid';
import TabModal from '../../../../TabModal';

interface CommitInfoProps {
  repoInfo: RepositoryInfo;
  dir: string;
}

const CommitInfo = memo(({repoInfo, dir}: CommitInfoProps) => {
  const [isCommitsModalOpen, setIsCommitsModalOpen] = useState(false);
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  const fetchCommits = useCallback(async () => {
    if (!dir) return;
    setLoadingCommits(true);
    try {
      const history = await gitIpc.getCommits(dir, 50);
      setCommits(history);
    } catch (err: any) {
      topToast.danger(`Failed to load commit list: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingCommits(false);
    }
  }, [dir]);

  useEffect(() => {
    if (isCommitsModalOpen) {
      fetchCommits();
    }
  }, [isCommitsModalOpen, fetchCommits]);

  const commitItems: DescriptionGridItem[] = [
    {key: 'branch', label: 'Current Branch', content: repoInfo.currentBranch},
    {
      key: 'hash',
      label: 'Last Commit Hash',
      content: <span className="break-all">{repoInfo.lastCommitHash}</span>,
    },
    {
      key: 'message',
      label: 'Last Commit Message',
      content: <span className="whitespace-pre-wrap">{repoInfo.lastCommitMessage}</span>,
    },
    {key: 'time', label: 'Last Commit Time', content: repoInfo.lastCommitTime},
  ];

  return (
    <>
      <DescriptionGrid
        title={
          <div className="flex items-center justify-between">
            <span>Commit Info</span>
            <Button size="sm" variant="secondary" onPress={() => setIsCommitsModalOpen(true)}>
              <History className="size-4 mr-1.5" />
              See Commit List
            </Button>
          </div>
        }
        columns={2}
        items={commitItems}
        itemClassName="bg-surface"
        className="bg-surface-secondary"
      />

      <TabModal
        size="lg"
        isOpen={isCommitsModalOpen}
        dialogClassName="w-3xl! max-w-3xl!"
        onOpenChange={setIsCommitsModalOpen}>
        <Modal.CloseTrigger />
        <Modal.Header>
          <Modal.Heading className="flex items-center gap-x-2">
            <History className="size-5 text-accent" />
            Commit History
          </Modal.Heading>
        </Modal.Header>
        <Modal.Body className="scrollbar-hide max-h-[60vh] overflow-y-auto pr-1">
          {loadingCommits ? (
            <div className="flex flex-col justify-center items-center gap-y-2 mt-2 py-8">
              <Spinner size="lg" />
              <Description className="text-sm">Fetching commits history...</Description>
            </div>
          ) : commits.length === 0 ? (
            <div className="text-center py-8 text-muted">No commits found in this repository.</div>
          ) : (
            <div className="flex flex-col gap-y-3">
              {commits.map(commit => {
                let commitUrl = '';
                if (repoInfo.remoteUrl && repoInfo.remoteUrl.includes('github.com')) {
                  const baseRemote = repoInfo.remoteUrl.replace(/\.git$/, '');
                  commitUrl = `${baseRemote}/commit/${commit.hash}`;
                }

                const handleCopyHash = async () => {
                  try {
                    await navigator.clipboard.writeText(commit.hash);
                    topToast.success('Commit hash copied to clipboard!');
                  } catch (e) {
                    console.error('Failed to copy commit hash:', e);
                    topToast.warning('Failed to copy. Please try again.');
                  }
                };

                const formatDate = (dateStr: string) => {
                  try {
                    const date = new Date(dateStr);
                    return date.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                  } catch {
                    return dateStr;
                  }
                };

                return (
                  <div
                    className={
                      'flex flex-col rounded-3xl bg-surface-secondary/60 border transition' +
                      'border-border p-4 pb-3 transition-all hover:bg-surface-secondary/90' +
                      ' hover:border-accent/20 duration-200'
                    }
                    key={commit.hash}>
                    <div className="flex items-start justify-between gap-x-4">
                      <div
                        className={
                          'font-semibold text-sm text-foreground/90 wrap-break-word line-clamp-2' +
                          ' flex-1 leading-snug'
                        }>
                        {commit.message}
                      </div>
                      <div className="flex items-center gap-x-1.5 shrink-0">
                        <span
                          className={
                            'font-JetBrainsMono text-xs text-muted bg-surface-secondary ' +
                            'px-2 py-0.5 rounded-md border border-surface-secondary/60'
                          }>
                          {commit.hash.substring(0, 7)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={handleCopyHash}
                          className="p-1.5 min-w-0 h-auto hover:bg-surface-secondary shrink-0"
                          isIconOnly>
                          <Copy className="size-3.5 text-muted hover:text-foreground transition-colors" />
                        </Button>
                        {commitUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() => window.open(commitUrl)}
                            className="p-1.5 min-w-0 h-auto hover:bg-surface-secondary shrink-0"
                            isIconOnly>
                            <ExternalLink className="size-3.5 text-muted hover:text-foreground transition-colors" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className={'flex flex-wrap items-center justify-between gap-2 text-xs text-muted pt-1'}>
                      <div className="truncate max-w-[320px]">
                        <span className="font-semisbold text-foreground/80">{commit.author_name}</span>
                      </div>
                      <div className="text-muted/60">{formatDate(commit.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal.Body>
      </TabModal>
    </>
  );
});

export default CommitInfo;
