import { Session, UserIdentity } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Input from '../../components/atoms/input';
import Header from '../../components/header';
import { SingleListData } from '../../types/apiTypes';
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

  useEffect(() => {
    fetchUserSession();
  }, []);

  useEffect(() => {
    fetchListDataAndAddToState();
  }, [session]);

  const addItem = async (item: string) => {
    const userData = session?.user as unknown as UserIdentity;
    try {
      const { data } = await addData(userData, item);

      setList([...list, ...data]);

      console.log('add success', data);
    } catch (e) {
      console.log('add error', e);
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
            placeholder="Enter text"
            className="drop-shadow-lg"
            onKeyUp={(e) => {
              console.log(text, 'text', typeof e.target);
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
