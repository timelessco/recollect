import axios from 'axios';
import { isEmpty, isNull } from 'lodash';
import { GetServerSideProps, NextPage } from 'next';
import { SingleListData } from '../../src/types/apiTypes';
import {
  GET_PUBLIC_CATEGORY_BOOKMARKS_API,
  NEXT_API_URL,
} from '../../src/utils/constants';

// this renders a public category page

interface PublicCategoryPageProps {
  data: SingleListData[];
}

const CategoryName: NextPage<PublicCategoryPageProps> = (props) => {
  return (
    <div>
      {props?.data?.map((item, index) => (
        <div key={index}>{item?.title}</div>
      ))}
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const res = await axios.post(
    `${NEXT_API_URL}${GET_PUBLIC_CATEGORY_BOOKMARKS_API}?category_slug=${context?.query?.id}&user_name=${context?.query?.category_id}`
  );

  if (isEmpty(res?.data?.data) || isNull(res?.data?.data)) {
    return {
      notFound: true,
    };
  }

  return {
    props: { data: res?.data?.data },
  };
};

export default CategoryName;
