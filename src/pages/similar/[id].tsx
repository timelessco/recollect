import type { ReactElement } from "react";

import type { NextPageWithLayout } from "../_app";

import Dashboard from "../../pageComponents/dashboard";

const SimilarBookmarksPage: NextPageWithLayout = () => null;

SimilarBookmarksPage.getLayout = (page: ReactElement) => <Dashboard>{page}</Dashboard>;

export default SimilarBookmarksPage;
