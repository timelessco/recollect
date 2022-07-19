/* eslint-disable @next/next/no-img-element */

import { SingleListData } from '../../types/apiTypes';
import { TrashIcon } from '@heroicons/react/solid';

interface CardSectionProps {
  listData: Array<SingleListData>;
  onDeleteClick: (post: SingleListData) => void;
}

const CardSection = ({ listData = [], onDeleteClick }: CardSectionProps) => {
  return (
    <div className="relative pb-20 px-4 sm:px-6 lg:pb-28 lg:px-8">
      <div className="absolute inset-0">
        <div className="bg-white h-1/3 sm:h-2/3" />
      </div>
      <div className="relative max-w-7xl mx-auto">
        <div className="mt-12 max-w-lg mx-auto grid gap-5 lg:grid-cols-3 lg:max-w-none">
          {listData
            .slice(0)
            .reverse()
            .map((post) => (
              <div
                key={post.id}
                className="flex flex-col rounded-lg shadow-lg overflow-hidden"
              >
                <div className="flex-shrink-0">
                  <img
                    className="h-48 w-full object-cover"
                    src="https://images.unsplash.com/photo-1496128858413-b36217c2ce36?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1679&q=80"
                    alt=""
                  />
                </div>
                <div className="flex-1 bg-white p-6 flex flex justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-600">
                      <a href="#" className="hover:underline">
                        Category
                      </a>
                    </p>
                    <a href="#" className="block mt-2">
                      <p className="text-xl font-semibold text-gray-900">
                        {post.task}
                      </p>
                      <p className="mt-3 text-base text-gray-500">
                        description
                      </p>
                    </a>
                  </div>
                  <div>
                    <TrashIcon
                      className="h-5 w-5 text-gray-400 cursor-pointer"
                      aria-hidden="true"
                      onClick={() => onDeleteClick(post)}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CardSection;