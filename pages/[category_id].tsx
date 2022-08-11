import type { NextPage } from 'next';
import Dashboard from '../pageComponents/dashboard';
import { dehydrate, QueryClient } from '@tanstack/react-query';

const Home: NextPage = () => {
  return (
    <>
      <Dashboard />
    </>
  );
};

export async function getStaticPaths() {
  return {
    paths: [{ params: { category_id: '1' } }],
    fallback: 'blocking', // can also be true or 'blocking'
  };
}

// This function gets called at build time
export async function getStaticProps() {
  const queryClient = new QueryClient();

  // await queryClient.prefetchQuery(['posts', 10], () => fetchPosts(10))

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}

export default Home;
