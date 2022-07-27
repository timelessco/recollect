import { Session, UserIdentity } from '@supabase/supabase-js';
import axios from 'axios';
import { useEffect, useState } from 'react';
import Input from '../../components/atoms/input';
import Header from '../../components/header';
import { SingleListData, UrlData } from '../../types/apiTypes';
import {
  addData,
  deleteData,
  fetchData,
  getCurrentUserSession,
  signInWithOauth,
  signOut,
} from '../../utils/supabaseCrudHelpers';
import CardSection from './cardSection';
import { useForm, SubmitHandler } from 'react-hook-form';
import isEmpty from 'lodash/isEmpty';
import { URL_PATTERN } from '../../utils/constants';
import { UrlInput } from '../../types/componentTypes';
import SignedOutSection from './signedOutSection';

const Dashboard = () => {
  const [session, setSession] = useState<Session>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [list, setList] = useState<SingleListData[]>([]);

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
    const { data } = await fetchData();
    setList(data);
  }

  const fetchUserSession = async () => {
    const currentSession = await getCurrentUserSession();
    setSession(currentSession);
  };

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

  const addItem = async (item: string) => {
    try {
      const apiRes = await axios.post(
        'https://bookmark-tags-git-dev-timelessco.vercel.app/api/screenshot',
        {
          access_token: session?.access_token,
          url: item,
        }
      );
      const userData = session?.user as unknown as UserIdentity;

      const scrapperData = apiRes.data.data.scrapperData;
      const screenshotUrl = apiRes.data.data.screenShot;

      const urlData = {
        title: scrapperData?.title,
        description: scrapperData?.description,
        url: scrapperData?.url,
        ogImage: scrapperData?.OgImage,
        screenshot: screenshotUrl,
      } as UrlData;

      console.log('urlDSata', urlData);

      const { data } = await addData(userData, urlData);
      setList([...list, ...data]);
    } catch (err) {
      console.error('err ,', err);
    } finally {
      console.log('finally');
    }
  };

  const deleteItem = async (item: SingleListData) => {
    try {
      await deleteData(item);

      setList(list?.filter((listItem) => listItem?.id !== item?.id));
    } catch (e) {
      console.log('delete error', e);
    }
  };

  const urlInputErrorText = () => {
    if (errors?.urlText?.type === 'pattern') {
      return 'Please enter valid email';
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
            />{' '}
          </>
        ) : (
          <SignedOutSection />
        )}
      </div>
    </>
  );
};

export default Dashboard;
