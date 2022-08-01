/* eslint-disable @next/next/no-img-element */
import Button from '../../components/atoms/button';
import { UrlData } from '../../types/apiTypes';

interface AddModalContentProps {
  addBookmark: () => void;
  urlData?: UrlData;
}

export default function AddModalContent(props: AddModalContentProps) {
  const { urlData, addBookmark } = props;
  return (
    <div>
      <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
        <div className="flex-shrink-0">
          <img
            className="h-10 w-10 rounded-sm"
            src={urlData?.ogImage || urlData?.screenshot}
            alt=""
          />
        </div>
        <div className="flex-1 min-w-0">
          <a href="#" className="focus:outline-none">
            <span className="absolute inset-0" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900">
              {urlData?.title}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {urlData?.description}
            </p>
          </a>
        </div>
      </div>
      <div className="mt-4">
        <Button className="w-full" onClick={addBookmark}>
          <span>Add Bookmark</span>
        </Button>
      </div>
    </div>
  );
}
