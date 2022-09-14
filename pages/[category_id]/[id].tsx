import { isEmpty } from 'lodash';
import { GetServerSideProps, NextPage } from 'next';
import { SingleListData } from '../../types/apiTypes';
import { MAIN_TABLE_NAME } from '../../utils/constants';
import { supabase } from '../../utils/supabaseClient';

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
  // const { data } = await supabase
  //   .from(MAIN_TABLE_NAME)
  //   .select(
  //     `
  //     *,
  //     category_id (
  //       category_slug
  //     )
  //   `
  //   )
  //   // .eq('user_id', context?.query?.category_id)
  //   .eq('category_id.category_slug', context?.query?.id);

  const { data } = await supabase
    .from(MAIN_TABLE_NAME)
    .select('*, category_id!inner(*), user_id!inner(*)')
    .eq('category_id.category_slug', context?.query?.id)
    .eq('user_id.user_name', context?.query?.category_id); // we need user name filter as if we change user name in url then this page should show 404

  if (isEmpty(data)) {
    return {
      notFound: true,
    };
  }

  return {
    props: { data },
  };
};

export default CategoryName;
