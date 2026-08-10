import {cn} from '@heroui/react';
import {RunningCard} from '@lynx/types';
import {StarIcon} from '@solar-icons/react/bold';
import {motion} from 'framer-motion';
import {memo} from 'react';

import {useAddressBar} from './useAddressBar';

type Props = {
  /**
   * The running card data.
   */
  runningCard: RunningCard;
  /**
   * Optional callback to set custom address.
   */
  setCustomAddress?: (address: string) => void;
};

/**
 * The address bar for the browser, supporting autocomplete, favorites, and URL parsing.
 */
const BrowserAddressBar = memo(({runningCard, setCustomAddress}: Props) => {
  const {
    editableRef,
    isAddress,
    isFocused,
    isFavorite,
    displayParts,
    autocomplete,
    inputValue,
    handleMouseDown,
    handleFocus,
    handleBlur,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleFavoriteToggle,
    handleContainerClick,
  } = useAddressBar({runningCard, setCustomAddress});

  const {prefix, domain, rest} = displayParts;

  return (
    <div
      className={cn(
        'relative flex items-center w-full h-8 mx-2 overflow-hidden rounded-full',
        'bg-[#f1f3f4] dark:bg-[#101010] hover:dark:bg-[#151515] focus-within:dark:bg-[#121212]',
        'transition-colors cursor-text',
      )}
      onClick={handleContainerClick}>
      {/* Layer 1: Styled Display View (Visible when not focused) */}
      <div
        className={cn(
          'absolute inset-0 flex items-center px-4 pointer-events-none transition-opacity duration-200',
          'right-10!',
          isFocused ? 'opacity-0' : 'opacity-100',
        )}>
        {isAddress ? (
          <p className="text-sm truncate">
            <span className="text-gray-500 dark:text-gray-400">{prefix}</span>
            <span className="text-black dark:text-white font-medium">{domain}</span>
            <span className="text-gray-500 dark:text-gray-400">{rest}</span>
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Type here to start browsing...</p>
        )}
      </div>

      {/* Layer 2: Editable Input with Autocomplete */}
      <div className="relative size-full">
        <div
          className={cn(
            'size-full px-4 text-sm truncate outline-none bg-transparent',
            'text-black dark:text-white',
            isFocused ? 'opacity-100' : 'opacity-0',
          )}
          ref={editableRef}
          spellCheck="false"
          onBlur={handleBlur}
          onFocus={handleFocus}
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          style={{minHeight: '32px', lineHeight: '32px'}}
          contentEditable
        />
        {/* Autocomplete suggestion overlay */}
        {isFocused && autocomplete && (
          <div
            style={{minHeight: '32px', lineHeight: '32px'}}
            className="absolute inset-0 px-4 text-sm pointer-events-none truncate">
            <span className="invisible">{inputValue}</span>
            <span className="text-gray-400 dark:text-gray-500">{autocomplete}</span>
          </div>
        )}
      </div>

      {isAddress && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <motion.button
            whileTap={{scale: 0.9}}
            whileHover={{scale: 1.15}}
            onClick={handleFavoriteToggle}
            className="p-1 rounded-full cursor-pointer"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
            <StarIcon
              className={cn(
                'transition-colors duration-200 size-5',
                isFavorite
                  ? 'text-yellow-500 fill-current'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white',
              )}
            />
          </motion.button>
        </div>
      )}
    </div>
  );
});

BrowserAddressBar.displayName = 'BrowserAddressBar';

export default BrowserAddressBar;
