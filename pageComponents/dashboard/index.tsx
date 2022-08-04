import { Session, UserIdentity } from '@supabase/supabase-js';
import { AxiosResponse } from 'axios';
import { useEffect, useState } from 'react';
import Input from '../../components/atoms/input';
import Header from '../../components/header';
import {
  BookmarksTagData,
  SingleListData,
  UserTagsData,
} from '../../types/apiTypes';
import {
  addData,
  addTagToBookmark,
  addUserTags,
  deleteData,
  fetchBookmakrsData,
  fetchUserTags,
  getBookmarkScrappedData,
  getCurrentUserSession,
  removeTagFromBookmark,
  signInWithOauth,
  signOut,
} from '../../utils/supabaseCrudHelpers';
import CardSection from './cardSection';
import { useForm, SubmitHandler } from 'react-hook-form';
import isEmpty from 'lodash/isEmpty';
import { URL_PATTERN } from '../../utils/constants';
import { TagInputOption, UrlInput } from '../../types/componentTypes';
import SignedOutSection from './signedOutSection';
import Modal from '../../components/modal';
import AddModalContent from './addModalContent';
import isNull from 'lodash/isNull';
import { getTagAsPerId } from '../../utils/helpers';
import { find } from 'lodash';

const Dashboard = () => {
  const [session, setSession] = useState<Session>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [list, setList] = useState<SingleListData[]>([]);
  const [showAddBookmarkModal, setShowAddBookmarkModal] =
    useState<boolean>(false);
  const [addedUrlData, setAddedUrlData] = useState<SingleListData>();
  const [userTags, setUserTags] = useState<UserTagsData[]>([]);
  const [selectedTag, setSelectedTag] = useState<TagInputOption[]>([]);
  const [isEdit, setIsEdit] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UrlInput>();
  const onSubmit: SubmitHandler<UrlInput> = (data) => {
    addItem(data.urlText);
    reset({ urlText: '' });
  };

  async function fetchListDataAndAddToState() {
    const { data } = await fetchBookmakrsData();
    setList(data);
    const { data: tagData } = await fetchUserTags();
    setUserTags(tagData);
  }

  const fetchUserSession = async () => {
    const currentSession = await getCurrentUserSession();
    setSession(currentSession);
  };

  useEffect(() => {
    if (!showAddBookmarkModal) {
      setIsEdit(false);
    }
  }, [showAddBookmarkModal]);

  // TODO: this is bad pattern fix this
  useEffect(() => {
    fetchUserSession();
    setTimeout(() => {
      fetchUserSession();
    }, 2000);
  }, []);

  useEffect(() => {
    fetchListDataAndAddToState();
  }, [session]);

  // gets scrapped data
  const addItem = async (item: string) => {
    try {
      const apiRes = (await getBookmarkScrappedData(item)) as AxiosResponse;

      const scrapperData = apiRes.data.data.scrapperData;
      const screenshotUrl = apiRes.data.data.screenShot;

      const urlData = {
        title: scrapperData?.title,
        description: scrapperData?.description,
        url: scrapperData?.url,
        ogImage: scrapperData?.OgImage,
        screenshot: screenshotUrl,
      } as SingleListData;

      setAddedUrlData(urlData);
      setShowAddBookmarkModal(true);
    } catch (err) {
      console.error('err ,', err);
    } finally {
      console.log('finally');
    }
  };

  const deleteItem = async (item: SingleListData) => {
    try {
      const delRes = (await deleteData(item)) as AxiosResponse;
      if (isNull(delRes.data.error)) {
        setList(list?.filter((listItem) => listItem?.id !== item?.id));
      }
    } catch (e) {
      console.log('delete error', e);
    }
  };

  const urlInputErrorText = () => {
    if (errors?.urlText?.type === 'pattern') {
      return 'Please enter valid url';
    } else if (errors?.urlText?.type === 'required') {
      return 'Please enter url';
    } else {
      return '';
    }
  };

  return (
    <>
      <Header
        userImg={session?.user?.user_metadata?.avatar_url}
        userName={session?.user?.user_metadata?.name}
        userEmail={session?.user?.user_metadata?.email}
        onSignOutClick={() => {
          signOut();
          setSession(undefined);
        }}
        onSigninClick={() => {
          signInWithOauth();
          fetchListDataAndAddToState();
        }}
      />
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        {session ? (
          <>
            {' '}
            <div className="mx-auto w-full lg:w-1/2 px-4 sm:px-0 pt-9 pb-14">
              <form onSubmit={handleSubmit(onSubmit)}>
                <Input
                  {...register('urlText', {
                    required: true,
                    pattern: URL_PATTERN,
                  })}
                  placeholder="Enter Url"
                  className="drop-shadow-lg"
                  isError={!isEmpty(errors)}
                  errorText={urlInputErrorText()}
                />
              </form>
            </div>
            <CardSection
              listData={list}
              onDeleteClick={(item) => deleteItem(item)}
              onEditClick={(item) => {
                setAddedUrlData(item);
                setIsEdit(true);
                setShowAddBookmarkModal(true);
              }}
            />{' '}
          </>
        ) : (
          <SignedOutSection />
        )}
      </div>
      <Modal
        open={showAddBookmarkModal}
        setOpen={() => setShowAddBookmarkModal(false)}
      >
        <AddModalContent
          mainButtonText={isEdit ? 'Update Bookmark' : 'Add Bookmark'}
          urlData={addedUrlData}
          userTags={userTags}
          addedTags={addedUrlData?.addedTags || []}
          addBookmark={async () => {
            if (!isEdit) {
              const userData = session?.user as unknown as UserIdentity;

              const { data } = await addData(userData, addedUrlData);

              const bookmarkTagsData = selectedTag?.map((item) => {
                return {
                  bookmark_id: data[0]?.id,
                  tag_id: parseInt(`${item?.value}`),
                  user_id: userData?.id,
                };
              }) as unknown as Array<BookmarksTagData>;

              const { data: bookmarkTagData } = await addTagToBookmark(
                bookmarkTagsData
              );

              const bookmarkDataWithTags = {
                ...data[0],
                addedTags: bookmarkTagData.map((item) => {
                  return {
                    name: getTagAsPerId(item?.tag_id, userTags)?.name,
                    created_at: item?.created_at,
                    id: item?.tag_id,
                    user_id: item?.user_id,
                  };
                }),
              } as SingleListData;

              setList([...list, bookmarkDataWithTags]);
            }
            setShowAddBookmarkModal(false);
          }}
          createTag={async (tagData) => {
            const userData = session?.user as unknown as UserIdentity;
            const { data } = await addUserTags(userData, {
              name: tagData[0]?.label,
            });

            setUserTags([...userTags, ...data]);
          }}
          removeExistingTag={async (tag) => {
            const delValue = tag.value;
            const delData = find(
              addedUrlData?.addedTags,
              (item) => item?.id === delValue
            ) as unknown as BookmarksTagData;

            const delTagApiRes = await removeTagFromBookmark(delData);

            if (isNull(delTagApiRes.error)) {
              const delApiData = delTagApiRes?.data[0];
              const updatedBookmaksList = list.map((item) => {
                if (item?.id === delApiData?.bookmark_id) {
                  return {
                    ...item,
                    addedTags: item?.addedTags.filter(
                      (tags) => tags.id !== delApiData?.tag_id
                    ),
                  };
                } else {
                  return item;
                }
              });
              setList(updatedBookmaksList);
            }
          }}
          addExistingTag={(tag) => setSelectedTag([...tag])}
        />
      </Modal>
    </>
  );
};

export default Dashboard;
