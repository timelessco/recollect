import type { NextPage } from "next";

import { Spinner } from "@/components/spinner";

import { useMounted } from "../hooks/useMounted";
import Dashboard from "../pageComponents/dashboard";

const Home: NextPage = () => {
  const isMounted = useMounted();

  if (!isMounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  return <Dashboard />;
};

export default Home;
