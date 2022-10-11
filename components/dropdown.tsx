import { Menu, Transition } from '@headlessui/react';
import React, { Fragment } from 'react';
import OptionsIconGray from '../icons/optionsIconGray';
import { tcm } from '../utils/tailwindMerge';
import Button from './atoms/button';

interface DropdownProps {
  menuClassName: string;
  options: Array<{ label: string; value: string | number }>;
  onOptionClick: (value: string | number) => void;
  buttonClassExtension?: string;
}

const Dropdown = (props: DropdownProps) => {
  const {
    menuClassName = '',
    options,
    onOptionClick,
    buttonClassExtension = '',
  } = props;

  function classNames(...classes: Array<string>) {
    return classes.filter(Boolean).join(' ');
  }

  const menuClass = tcm(
    'origin-top-left right-0 absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 focus:outline-none',
    menuClassName
  );

  return (
    <Menu as="div" className="flex-shrink-0 relative">
      {({ open }) => (
        <>
          <Menu.Button as="div">
            <Button
              type="light"
              className={`py-0 -mx-2  bg-black/[0.004] hover:bg-black/[0.004] ${
                !open ? buttonClassExtension : ''
              }`}
            >
              <figure className="w-3 h-3">
                <OptionsIconGray size="12" />
              </figure>
            </Button>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className={menuClass}>
              {options?.map((item) => {
                return (
                  <Menu.Item key={item?.value}>
                    {({ active }) => (
                      <div
                        className={` cursor-pointer ${classNames(
                          active ? 'bg-gray-100' : '',
                          'block py-2 px-4 text-sm text-gray-700'
                        )}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onOptionClick(item?.value);
                        }}
                      >
                        {item?.label}
                      </div>
                    )}
                  </Menu.Item>
                );
              })}
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default Dropdown;
