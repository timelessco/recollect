import { Session, UserIdentity } from '@supabase/supabase-js';
import { AxiosResponse } from 'axios';
import { useEffect, useState } from 'react';
import Input from '../../components/atoms/input';
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
import DashboardLayout from './dashboardLayout';

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
  const [url, setUrl] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UrlInput>();
  const onSubmit: SubmitHandler<UrlInput> = (data) => {
    setUrl(data.urlText);
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
      setAddedUrlData(undefined);
      setSelectedTag([]);
      setUrl('');
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
    setShowAddBookmarkModal(true);

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

  const renderAllBookmarkCards = () => {
    return (
      <>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {session ? (
            <>
              {' '}
              <div className="mx-auto w-full lg:w-1/2 px-4 sm:px-0">
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
            urlString={url}
            mainButtonText={isEdit ? 'Update Bookmark' : 'Add Bookmark'}
            urlData={addedUrlData}
            userTags={userTags}
            addedTags={addedUrlData?.addedTags || []}
            addBookmark={async () => {
              const userData = session?.user as unknown as UserIdentity;

              if (!isEdit) {
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
                      bookmark_tag_id: item?.id,
                    };
                  }),
                } as SingleListData;

                setList([bookmarkDataWithTags, ...list]);
              } else {
              }
              setShowAddBookmarkModal(false);
            }}
            createTag={async (tagData) => {
              const userData = session?.user as unknown as UserIdentity;
              const { data } = await addUserTags(userData, {
                name: tagData[tagData?.length - 1]?.label,
              });

              setUserTags([...userTags, ...data]);
              setSelectedTag([
                ...selectedTag,
                ...data.map((item) => {
                  return {
                    value: item?.id,
                    label: item?.name,
                  };
                }),
              ]);

              if (isEdit) {
                // TODO: this is duplicate
                const bookmarkTagsData = {
                  bookmark_id: addedUrlData?.id,
                  tag_id: data[0]?.id,
                  user_id: userData?.id,
                } as unknown as BookmarksTagData;

                const { data: bookmarkTagData } = await addTagToBookmark(
                  bookmarkTagsData
                );
                const updatedData = list.map((item) => {
                  if (item?.id === addedUrlData?.id) {
                    return {
                      ...item,
                      addedTags: [
                        ...item?.addedTags,
                        {
                          ...data[0],
                          bookmark_tag_id: bookmarkTagData[0]?.id,
                        },
                      ],
                    };
                  } else {
                    return item;
                  }
                }) as Array<SingleListData>;

                setList(updatedData);
              }
            }}
            removeExistingTag={async (tag) => {
              setSelectedTag(
                selectedTag.filter((item) => item?.value !== tag?.value)
              );
              if (isEdit) {
                const delValue = tag.value;
                const currentBookark = list.filter(
                  (item) => item?.id === addedUrlData?.id
                );
                const delData = find(
                  currentBookark[0]?.addedTags,
                  (item) => item?.id === delValue || item?.name === delValue
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
              }
            }}
            addExistingTag={async (tag) => {
              setSelectedTag([...selectedTag, tag[tag?.length - 1]]);

              if (isEdit) {
                const userData = session?.user as unknown as UserIdentity;
                const bookmarkTagsData = {
                  bookmark_id: addedUrlData?.id,
                  tag_id: parseInt(`${tag[tag.length - 1]?.value}`),
                  user_id: userData?.id,
                } as unknown as BookmarksTagData;

                const { data: bookmarkTagData } = await addTagToBookmark(
                  bookmarkTagsData
                );
                const updatedData = list.map((item) => {
                  if (item?.id === addedUrlData?.id) {
                    return {
                      ...item,
                      addedTags: [
                        ...item?.addedTags,
                        {
                          ...getTagAsPerId(bookmarkTagsData?.tag_id, userTags),
                          bookmark_tag_id: bookmarkTagData[0]?.id,
                        },
                      ],
                    };
                  } else {
                    return item;
                  }
                }) as Array<SingleListData>;

                setList(updatedData);
              }
            }}
          />
        </Modal>
      </>
    );
  };

  return (
    <DashboardLayout
      renderMainContent={renderAllBookmarkCards}
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
  );
};

export default Dashboard;
