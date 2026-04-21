import type { ReactElement } from "react";

import type { NextPageWithLayout } from "../../../_app";

import Dashboard from "../../../../pageComponents/dashboard";

const SimilarPreviewPage: NextPageWithLayout = () => null;

SimilarPreviewPage.getLayout = (page: ReactElement) => <Dashboard>{page}</Dashboard>;

export default SimilarPreviewPage;
