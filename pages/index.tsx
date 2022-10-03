import axios from 'axios';
import type { NextPage } from 'next';
import Dashboard from '../pageComponents/dashboard';

const Home: NextPage = () => {
  return (
    <>
      <button
        onClick={async () => {
          const res = await axios.get(
            'https://bookmark-tags-jbbi5sx2k-timelessco.vercel.app/api/hello'
          );

          console.log('ddd', res);
        }}
      >
        test
      </button>
      <Dashboard />
    </>
  );
};

export default Home;
