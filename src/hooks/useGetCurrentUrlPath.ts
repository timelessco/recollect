import { useRouter } from "next/router";

// gets current url path , eg if url is <origin>/all-bookmarks , this hook will return all-bookmarks
export default function useGetCurrentUrlPath() {
	const router = useRouter();

	const currentPath = router.asPath.split("/")[1] || null;

	return currentPath;
}
