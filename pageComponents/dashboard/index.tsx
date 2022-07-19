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

const Dashboard = () => {
  const [session, setSession] = useState<Session>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [list, setList] = useState<SingleListData[]>([]);
  const [text, setText] = useState('');

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

  // TODO : clean this
  const addItem = async (item: string) => {
    const userData = session?.user as unknown as UserIdentity;
    axios
      .post('https://link-preview-livid-ten.vercel.app/api/getUrlData', {
        url: item,
      })
      .then(async (apiRes) => {
        try {
          const urlData = {
            title: apiRes?.data?.title,
            description: apiRes?.data?.description,
            url: apiRes?.data?.url,
            ogImage: apiRes?.data?.OgImage,
          } as UrlData;

          const { data } = await addData(userData, urlData);

          setList([...list, ...data]);
        } catch (e) {
          console.log('err', e);
        }
      })
      .catch((err) => console.log('err', err));
  };

  const deleteItem = async (item: SingleListData) => {
    try {
      await deleteData(item);

      setList(list?.filter((listItem) => listItem?.id !== item?.id));
    } catch (e) {
      console.log('delete error', e);
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
        <div className="mx-auto w-full lg:w-1/2 px-4 sm:px-0 pt-9 pb-14">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter Url"
            className="drop-shadow-lg"
            onKeyUp={(e) => {
              if (e.keyCode === 13) {
                addItem(text);
                setText('');
              }
            }}
          />
        </div>
        <CardSection
          listData={list}
          onDeleteClick={(item) => deleteItem(item)}
        />
      </div>
    </>
  );
};

export default Dashboard;
