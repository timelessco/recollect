import { Menu, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';
import uFuzzy from '@leeoniya/ufuzzy';
import SearchIconSmallGray from '../../icons/searchIconSmallGray';
import isNull from 'lodash/isNull';
import { find } from 'lodash';
import { options } from '../../utils/commonData';

interface CategoryIconsDropdownTypes {
  onIconSelect: (value: string) => void;
  iconValue: string | null;
}

export default function CategoryIconsDropdown(
  props: CategoryIconsDropdownTypes
) {
  const { onIconSelect, iconValue } = props;

  const [finalFilteredOptions, setFinalFilteredOptions] = useState<
    Array<number>
  >(options?.map((index) => index) as unknown as Array<number>);

  const [filterInputValue, setFilterInputValue] = useState('');

  const uf = new uFuzzy({});

  const filterOptions = options?.map((item) => {
    return item?.label;
  });
  useEffect(() => {
    const idxs = uf.filter(filterOptions, filterInputValue);
    setFinalFilteredOptions(idxs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterInputValue]);

  return (
    <div className="">
      <Menu as="div" className="">
        <div>
          <Menu.Button className="">
            {isNull(iconValue)
              ? options[4]?.icon()
              : find(options, (item) => item?.label === iconValue)?.icon()}
          </Menu.Button>
        </div>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute px-3 left-4 z-10 mt-2 w-[319px] origin-top-left rounded-xl bg-white shadow-custom-1 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-3 flex items-center justify-between border-b-custom-gray-7 border-b-[1px]">
              <span className="text-custom-gray-1 text-sm leading-4 font-medium">
                Choose an icon
              </span>
              <div className="flex items-center py-[7px] px-[10px] bg-custom-gray-6 w-[139px] rounded-lg">
                <figure className="w-3 h-3 mr-[6px]">
                  <SearchIconSmallGray />
                </figure>
                <input
                  className="w-[101px] bg-custom-gray-6 text-custom-gray-3 font-normal text-sm leading-4 focus:outline-none"
                  placeholder="Search"
                  value={filterInputValue}
                  onChange={(e) => {
                    setFilterInputValue(e.target.value);
                  }}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex pt-2 pb-3">
              {finalFilteredOptions.map((item, index) => {
                return (
                  <div className="px-1 py-1 flex" key={index}>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          title={options[item]?.label}
                          onClick={() => {
                            onIconSelect(options[item]?.label);
                          }}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } p-1 rounded-md`}
                        >
                          {options[item]?.icon()}
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                );
              })}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
}
