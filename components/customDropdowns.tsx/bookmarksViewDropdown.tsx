import { Menu, Transition } from '@headlessui/react';
import React, { Fragment, useState } from 'react';
import MoodboardIconGray from '../../icons/moodboardIconGray';
import { useMiscellaneousStore } from '../../store/componentStore';
import Button from '../atoms/button';
import Slider from '../slider';

const BookmarksViewDropdown = () => {
  // const [moodboardColumns, setMoodboardColumns] = useState(30);

  const moodboardColumns = useMiscellaneousStore(
    (state) => state.moodboardColumns
  );

  const setMoodboardColumns = useMiscellaneousStore(
    (state) => state.setMoodboardColumns
  );

  return (
    <Menu as="div" className="flex-shrink-0 relative">
      {({ open }) => (
        <>
          <div>
            <Menu.Button as="div">
              <Button type="light" className={open ? 'bg-custom-gray-2' : ''}>
                <figure className="w-3 h-3">
                  <MoodboardIconGray />
                </figure>
                <span className="ml-[7px] text-custom-gray-1">Moodboard</span>
              </Button>
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
            <Menu.Items className="absolute px-3 right-0 z-10 mt-2 w-[167px] origin-top-left rounded-xl bg-white shadow-custom-1 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="flex pt-2 pb-3">
                {/* {finalFilteredOptions.map((item, index) => {
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
            })} */}
                {/* <Menu.Item>
                  {({ active }) => (
                    <button
                      // title={options[item]?.label}
                      // onClick={() => {
                      //   onIconSelect(options[item]?.label);
                      // }}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } p-1 rounded-md`}
                    >
                      OPTONS
                    </button>
                  )}
                </Menu.Item> */}
                <Slider
                  value={moodboardColumns}
                  onValueChange={(value) => setMoodboardColumns(value)}
                />
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default BookmarksViewDropdown;
