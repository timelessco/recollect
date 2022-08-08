/* eslint-disable @next/next/no-img-element */
import { OnChangeValue } from 'react-select';
import Button from '../../components/atoms/button';
import Input from '../../components/atoms/input';
import LabelledComponent from '../../components/labelledComponent';
import TagInput from '../../components/tagInput';
import { UrlData, UserTagsData } from '../../types/apiTypes';
import { TagInputOption } from '../../types/componentTypes';

interface AddModalContentProps {
  addBookmark: () => void;
  urlData?: UrlData;
  userTags?: Array<UserTagsData>;
  createTag: (value: OnChangeValue<TagInputOption, true>) => void;
  addExistingTag: (value: OnChangeValue<TagInputOption, true>) => void;
  removeExistingTag: (value: TagInputOption) => void;
  addedTags: Array<UserTagsData>;
  mainButtonText: string;
  urlString: string;
}

export default function AddModalContent(props: AddModalContentProps) {
  const {
    urlData,
    addBookmark,
    userTags,
    createTag,
    addExistingTag,
    removeExistingTag,
    addedTags,
    mainButtonText,
    urlString,
  } = props;

  const renderBookmarkDataCard = () => {
    if (urlData) {
      return (
        <>
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
        </>
      );
    } else {
      return (
        <div className="animate-pulse flex flex-row items-center space-x-4 w-full">
          <div
            id="image-load"
            className="rounded-sm bg-slate-200 h-10 w-10"
          ></div>
          <div className="flex-1 min-w-0">
            <div className="h-3 bg-slate-200 w-1/2 rounded mb-1"></div>
            <div className="space-y-1">
              <div className="h-2 bg-slate-200  rounded"></div>
              <div className="h-2 bg-slate-200 w-4/5 rounded"></div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div id="modal-content">
      <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
        {renderBookmarkDataCard()}
      </div>
      <div className="pt-4">
        <LabelledComponent label="Url">
          <Input
            value={urlString || urlData?.url}
            isDisabled
            placeholder=""
            isError={false}
            errorText=""
            className=""
          />
        </LabelledComponent>
        <LabelledComponent label="Tags">
          <TagInput
            options={userTags?.map((item) => {
              return {
                value: item?.id,
                label: item?.name,
              };
            })}
            defaultValue={addedTags?.map((item) => {
              return {
                value: item?.id,
                label: item?.name,
              };
            })}
            createTag={createTag}
            addExistingTag={addExistingTag}
            removeExistingTag={removeExistingTag}
          />
        </LabelledComponent>
      </div>
      <div className="mt-4">
        <Button className="w-full" onClick={addBookmark}>
          <span>{mainButtonText}</span>
        </Button>
      </div>
    </div>
  );
}
