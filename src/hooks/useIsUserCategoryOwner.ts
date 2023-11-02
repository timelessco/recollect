import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";

import { type CategoriesData } from "../types/apiTypes";
import { CATEGORIES_KEY } from "../utils/constants";

import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

// tells if the logged in user is the category owner
export default function useGetFlattendPaginationBookmarkData() {
	const session = useSession();
	const queryClient = useQueryClient();
	const { category_id: categoryId } = useGetCurrentCategoryId();
	const userId = session?.user?.id;

	if (typeof categoryId !== "number") {
		// in this case user is in a non-catogory page like trash
		return { isOwner: true };
	}

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const isOwner =
		find(categoryData?.data, (item) => item?.id === categoryId)?.user_id?.id ===
		userId;

	return { isOwner };
}
