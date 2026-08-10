import {Card, Checkbox, Key, Label, ListBox, NumberField, Select, Spinner} from '@heroui/react';
import {extractGitUrl} from '@lynx_common/utils';
import {SettingsMinimalisticIcon, ShieldWarningIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {Dispatch, SetStateAction, useEffect, useState} from 'react';

import {topToast} from '../../../../../layouts/ToastProviders';
import {CloneOptionsResult} from './CloneRepo';

type Branch = {
  name: string;
};

export interface CloneOptionsProps {
  /** The original git URL used to calculate dynamic repository attributes (like branch lists). */
  url: string;
  /** Standard React setState method to hook clone variables up to the parent component. */
  setCloneOptionsResult: Dispatch<SetStateAction<CloneOptionsResult>>;
}

/**
 * Handles customizing advanced git settings (ex: specifying a branch to use, or doing shallow depth clones).
 * Dynamically queries Github for meta branches info to pre-fill the selections.
 *
 * @param {CloneOptionsProps} props - The component props.
 */
export default function CloneOptions({url, setCloneOptionsResult}: CloneOptionsProps) {
  const [loading, setLoading] = useState<boolean>(true);

  const [enabledDepth, setEnabledDepth] = useState<boolean>(false);
  const [depthValue, setDepthValue] = useState<number>(1);

  const [enabledSingleBranch, setEnabledSingleBranch] = useState<boolean>(true);

  const [selectedBranch, setSelectedBranch] = useState<Key | null>(null);
  const [branches, setBranches] = useState<{key: string; value: string}[]>([]);

  useEffect(() => {
    if (selectedBranch || typeof selectedBranch === 'string') {
      setCloneOptionsResult({
        branch: selectedBranch.toString(),
        singleBranch: enabledSingleBranch,
        depth: enabledDepth ? depthValue : undefined,
      });
    }
  }, [selectedBranch, enabledSingleBranch, enabledDepth, depthValue]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const {owner, repo} = extractGitUrl(url);
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!repoResponse.ok) {
          topToast.danger(`Failed to fetch repository details: ${repoResponse.status}`);
          return;
        }
        const repoData = await repoResponse.json();
        const defaultBranch = repoData.default_branch;

        const branchesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`);
        if (!branchesResponse.ok) {
          topToast.danger(`Failed to fetch branches: ${branchesResponse.status}`);
          return;
        }
        const branchesData: Branch[] = await branchesResponse.json();

        setSelectedBranch(defaultBranch);
        setBranches(
          branchesData.map(b => {
            return {key: b.name, value: b.name};
          }),
        );
      } catch (err: any) {
        topToast.danger(err.message || 'An error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return (
    <Card variant="secondary">
      <Card.Header className="gap-x-2 flex flex-row items-center text-surface-secondary-foreground">
        <SettingsMinimalisticIcon />
        <span>Clone Options</span>
      </Card.Header>
      <Card.Content>
        {loading ? (
          <div className="w-full flex flex-col items-center gap-2 mb-2">
            <Spinner size="xl" />
            <span className="text-sm text-muted">Fetching repository information...</span>
          </div>
        ) : isEmpty(branches) ? (
          <div className="flex flex-col items-center justify-center p-2 gap-y-1">
            <ShieldWarningIcon className="size-14 text-warning" />
            <span className="text-lg font-medium">Unable to retrieve repository branches</span>
            <p className="text-sm text-muted">The default repository branch will be used for cloning.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-y-4">
            <div className="space-x-2 flex flex-row items-center">
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
