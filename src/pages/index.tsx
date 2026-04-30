import type { ReactElement } from "react";

import type { NextPageWithLayout } from "./_app";

import Dashboard from "../pageComponents/dashboard";

const Home: NextPageWithLayout = () => null;

Home.getLayout = (page: ReactElement) => <Dashboard>{page}</Dashboard>;

export default Home;
