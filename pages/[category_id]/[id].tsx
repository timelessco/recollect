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
  const { data } = await supabase
    .from(MAIN_TABLE_NAME)
    .select()
    .eq('user_id', context?.query?.category_id) // user id not needed as only cat owners can add data
    .eq('category_id', context?.query?.id);

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
