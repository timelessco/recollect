import { useQuery } from "@tanstack/react-query";

import useDebounce from "../../../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../../../hooks/useGetCurrentCategoryId";
import { useMiscellaneousStore } from "../../../../store/componentStore";
import { AI_SEARCH_KEY, BOOKMARKS_VIEW } from "../../../../utils/constants";
import { fetchBookmarksViews } from "../../../supabaseCrudHelpers";
import { aiSearch } from "../../../supabaseCrudHelpers/ai/search";

const useAiSearch = () => {
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const aiButtonToggle = useMiscellaneousStore((state) => state.aiButtonToggle);

	const debouncedSearch = useDebounce(searchText, 500);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { data } = useQuery(
		[AI_SEARCH_KEY, CATEGORY_ID, debouncedSearch],
		async () => aiButtonToggle && (await aiSearch(debouncedSearch)),
	);

	return { data };
};

export default useAiSearch;
