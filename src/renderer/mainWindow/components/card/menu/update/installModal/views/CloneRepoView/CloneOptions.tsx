import {Card, Checkbox, Key, Label, ListBox, NumberField, Select, Spinner} from '@heroui/react';
import {extractGitUrl} from '@lynx_common/utils';
import {SettingsMinimalisticIcon, ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {Dispatch, memo, SetStateAction, useEffect, useState} from 'react';

export interface CloneOptionsResult {
  branch: string;
  singleBranch: boolean;
  depth?: number;
}

interface Branch {
  name: string;
}

export interface CloneOptionsProps {
  /** The original git URL used to fetch dynamic repository details (branches, default branch). */
  url: string;
  /** State updater to sync clone parameters with parent view. */
  setCloneOptionsResult: Dispatch<SetStateAction<CloneOptionsResult>>;
}

/**
 * Handles customizing advanced git settings (branch selection, shallow depth, single branch).
 * Fetches branch metadata from GitHub API if the target URL is on GitHub.
 */
function CloneOptions({url, setCloneOptionsResult}: CloneOptionsProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [enabledDepth, setEnabledDepth] = useState<boolean>(false);
  const [depthValue, setDepthValue] = useState<number>(1);
  const [enabledSingleBranch, setEnabledSingleBranch] = useState<boolean>(true);
  const [selectedBranch, setSelectedBranch] = useState<Key | null>(null);
  const [branches, setBranches] = useState<{key: string; value: string}[]>([]);

  useEffect(() => {
    setCloneOptionsResult({
      branch: selectedBranch ? selectedBranch.toString() : '',
      singleBranch: enabledSingleBranch,
      depth: enabledDepth ? depthValue : undefined,
    });
  }, [selectedBranch, enabledSingleBranch, enabledDepth, depthValue, setCloneOptionsResult]);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        let gitInfo: {owner: string; repo: string; platform: 'github' | 'gitlab'} | null = null;
        try {
          gitInfo = extractGitUrl(url);
        } catch {
          // Non-standard git URL (e.g. self-hosted, arbitrary url)
          gitInfo = null;
        }

        // Only query GitHub API if the repository is specifically on GitHub
        if (!gitInfo || gitInfo.platform !== 'github') {
          if (!abortController.signal.aborted) {
            setBranches([]);
            setSelectedBranch(null);
            setLoading(false);
          }
          return;
        }

        const {owner, repo} = gitInfo;
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          signal: abortController.signal,
        });

        if (!repoResponse.ok) {
          console.warn(`GitHub API repo fetch failed: ${repoResponse.status} ${repoResponse.statusText}`);
          if (!abortController.signal.aborted) {
            setBranches([]);
            setSelectedBranch(null);
          }
          return;
        }

        const repoData = await repoResponse.json();
        const defaultBranch = repoData.default_branch || 'main';

        const branchesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, {
          signal: abortController.signal,
        });

        if (!branchesResponse.ok) {
          console.warn(`GitHub API branches fetch failed: ${branchesResponse.status} ${branchesResponse.statusText}`);
          if (!abortController.signal.aborted) {
            setSelectedBranch(defaultBranch);
            setBranches([{key: defaultBranch, value: defaultBranch}]);
          }
          return;
        }

        const branchesData: Branch[] = await branchesResponse.json();

        if (!abortController.signal.aborted) {
          setSelectedBranch(defaultBranch);
          setBranches(
            branchesData.map(b => ({
              key: b.name,
              value: b.name,
            })),
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === 'AbortError' || abortController.signal.aborted)) {
          return;
        }
        console.warn('Error fetching repository details:', err);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [url]);

  return (
    <Card variant="secondary">
      <Card.Header className="flex flex-row items-center gap-x-2 text-surface-secondary-foreground">
        <SettingsMinimalisticIcon />
        <span>Clone Options</span>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <div className="mb-2 flex w-full flex-col items-center gap-2">
            <Spinner size="xl" />
            <span className="text-sm text-muted">Fetching repository information...</span>
          </div>
        ) : isEmpty(branches) ? (
          <div className="flex flex-col items-center justify-center gap-y-1 p-2">
            <ShieldWarningIcon className="size-14 text-warning" />
            <span className="text-lg font-medium">Unable to retrieve repository branches</span>
            <p className="text-sm text-muted">The default repository branch will be used for cloning.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-y-4">
            <div className="flex flex-row items-center space-x-2">
              <Select value={selectedBranch} onChange={setSelectedBranch} placeholder="Select target branch" fullWidth>
                <Label>Branch:</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {branches.map(branch => (
                      <ListBox.Item id={branch.key} key={branch.key} textValue={branch.value}>
                        {branch.value}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <div className="flex gap-x-4">
              <Checkbox isSelected={enabledSingleBranch} onChange={setEnabledSingleBranch}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  Limit clone to a single branch
                </Checkbox.Content>
              </Checkbox>
              <Checkbox isSelected={enabledDepth} onChange={setEnabledDepth}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  Perform a shallow clone
                </Checkbox.Content>
              </Checkbox>
            </div>

            <NumberField
              minValue={1}
              onChange={setDepthValue}
              defaultValue={depthValue}
              isDisabled={!enabledDepth}
              fullWidth>
              <Label>Depth:</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

export default memo(CloneOptions);
