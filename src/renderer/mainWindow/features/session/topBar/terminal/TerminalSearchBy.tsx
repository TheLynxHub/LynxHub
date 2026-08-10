import {Avatar, Button, Dropdown, Header, Label} from '@heroui/react';
import {SearchQuerySites} from '@lynx_common/types';
import {getCacheUrl, getSearchUrl} from '@lynx_common/utils';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {EarthIcon, SquareTopDownIcon} from '@solar-icons/react/bold-duotone';
import {AnimatePresence, motion} from 'framer-motion';
import {memo, useCallback} from 'react';

import LynxTooltip from '../../../../components/LynxTooltip';

const endContent = <SquareTopDownIcon className="size-3 group-hover:opacity-100 opacity-0 transition duration-300" />;

type Props = {
  /**
   * The selected text in the terminal.
   */
  selectedTerminalText: string;
};

/**
 * Dropdown to search selected terminal text on various search engines.
 */
const TerminalSearchBy = memo(({selectedTerminalText}: Props) => {
  const searchSelectedText = useCallback(
    (key: SearchQuerySites) => {
      AddBreadcrumb_Renderer(`Terminal: Search selected text by: ${key}`);
      window.open(getSearchUrl(selectedTerminalText, key));
    },
    [selectedTerminalText],
  );

  return (
    <AnimatePresence>
      {selectedTerminalText && (
        <motion.div
          exit={{translateY: 5, opacity: 0, scale: 0.7}}
          animate={{translateY: 0, opacity: 1, scale: 1}}
          initial={{translateY: 5, opacity: 0, scale: 0.7}}>
          <Dropdown>
            <Dropdown.Trigger>
              <LynxTooltip delay={500} content="Search selected text by">
                <Button size="sm" variant="ghost" aria-label="Search selected text" isIconOnly>
                  <EarthIcon className="size-3.5" />
                </Button>
              </LynxTooltip>
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu>
                <Dropdown.Section>
                  <Header>Search selected text by</Header>
                  <Dropdown.Item textValue="Google" onPress={() => searchSelectedText('Google')}>
                    <Avatar className="size-6">
                      <Avatar.Image alt="Google icon" src={getCacheUrl('https://www.google.com/favicon.ico')} />
                      <Avatar.Fallback>G</Avatar.Fallback>
                    </Avatar>
                    <Label>Google</Label>
                    {endContent}
                  </Dropdown.Item>
                  <Dropdown.Item textValue="DuckDuckGo" onPress={() => searchSelectedText('DuckDuckGo')}>
                    <Avatar className="size-6">
                      <Avatar.Image alt="DuckDuckGo icon" src={getCacheUrl('https://duckduckgo.com/favicon.ico')} />
                      <Avatar.Fallback>D</Avatar.Fallback>
                    </Avatar>
                    <Label>DuckDuckGo</Label>
                    {endContent}
                  </Dropdown.Item>
                  <Dropdown.Item textValue="Reddit" onPress={() => searchSelectedText('Reddit')}>
                    <Avatar className="size-6">
                      <Avatar.Image alt="Reddit icon" src={getCacheUrl('https://www.reddit.com/favicon.ico')} />
                      <Avatar.Fallback>R</Avatar.Fallback>
                    </Avatar>
                    <Label>Reddit</Label>
                    {endContent}
                  </Dropdown.Item>
                  <Dropdown.Item textValue="ChatGPT" onPress={() => searchSelectedText('ChatGPT')}>
                    <Avatar className="size-6">
                      <Avatar.Image alt="ChatGPT icon" src={getCacheUrl('https://chat.openai.com/favicon.ico')} />
                      <Avatar.Fallback>C</Avatar.Fallback>
                    </Avatar>
                    <Label>ChatGPT</Label>
                    {endContent}
                  </Dropdown.Item>
                  <Dropdown.Item textValue="Perplexity" onPress={() => searchSelectedText('Perplexity')}>
                    <Avatar className="size-6">
                      <Avatar.Image alt="Perplexity icon" src={getCacheUrl('https://www.perplexity.ai/favicon.ico')} />
                      <Avatar.Fallback>P</Avatar.Fallback>
                    </Avatar>
                    <Label>Perplexity</Label>
                    {endContent}
                  </Dropdown.Item>
                  <Dropdown.Item textValue="Claude" onPress={() => searchSelectedText('Claude')}>
                    <Avatar className="size-6">
                      <Avatar.Image alt="Claude icon" src={getCacheUrl('https://www.anthropic.com/favicon.ico')} />
                      <Avatar.Fallback>C</Avatar.Fallback>
                    </Avatar>
                    <Label>Claude</Label>
                    {endContent}
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

TerminalSearchBy.displayName = 'TerminalSearchBy';

export default TerminalSearchBy;
