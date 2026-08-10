import {Dropdown, Label, Selection} from '@heroui/react';
import {Button} from '@heroui/react';
import {Apps_Color_Icon, History_Color_Icon, Pin_Color_Icon} from '@lynx_assets/icons/Icons_Colorful';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {FilterIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback} from 'react';

/**
 * Props for the HomeFilter component.
 */
interface HomeFilterProps {
  /** The currently selected category keys (e.g., "Pin", "Recently", "All"). */
  selectedCategories: string[];
}

/**
 * A dropdown button that filters the visible cards on the Home page by their logical category.
 *
 * @param {HomeFilterProps} props Contains the currently selected category strings.
 * @returns {JSX.Element} A dropdown selection menu for filtering cards.
 */
const HomeFilter = memo(({selectedCategories}: HomeFilterProps) => {
  /**
   * Handles selection changes from the DropdownMenu.
   * Modifies the global category preference using the storage IPC.
   *
   * @param {Selection} keys The new Set of selected keys, or the string 'all'.
   */
  const handleSelectionChange = useCallback((keys: Selection) => {
    AddBreadcrumb_Renderer(`Home Filter: keys:${JSON.stringify(keys)}`);
    if (keys === 'all') {
      storageUtilsIpc.invoke.homeCategory('set', ['Pin', 'Recently', 'All']);
    } else {
      storageUtilsIpc.invoke.homeCategory('set', Array.from(keys).map(String));
    }
  }, []);

  return (
    <Dropdown aria-label="Filter Categories">
      <Button variant="tertiary" className="shrink-0" isIconOnly>
        <FilterIcon />
      </Button>

      <Dropdown.Popover>
        <Dropdown.Menu
          selectionMode="multiple"
          selectedKeys={selectedCategories}
          onSelectionChange={handleSelectionChange}>
          <Dropdown.Section>
            <Dropdown.Item id="Pin" textValue="Pinned">
              <Pin_Color_Icon className="size-4" id="home_filter_pin" />
              <Label>PINNED</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
            <Dropdown.Item id="Recently" textValue="Recently Used">
              <History_Color_Icon className="size-4" id="home_filter_history" />
              <Label>RECENTLY USED</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
            <Dropdown.Item id="All" textValue="All">
              <Apps_Color_Icon className="size-4" id="home_filter_app_color" />
              <Label>ALL</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
});

export default HomeFilter;
