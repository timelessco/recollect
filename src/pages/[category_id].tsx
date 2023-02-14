import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import type { GetServerSideProps, NextPage } from "next";

import Dashboard from "../pageComponents/dashboard";

const Home: NextPage = () => {
  return <Dashboard />;
};

export const getServerSideProps: GetServerSideProps = async ctx => {
  const queryClient = new QueryClient();

  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx);
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session)
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      initialSession: session,
      user: session.user,
    },
  };
};

export default Home;
