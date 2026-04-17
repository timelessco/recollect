import type { ReactElement } from "react";

import type { NextPageWithLayout } from "./_app";

import Dashboard from "../pageComponents/dashboard";

const CategoryPage: NextPageWithLayout = () => null;

CategoryPage.getLayout = (page: ReactElement) => <Dashboard>{page}</Dashboard>;

export default CategoryPage;
