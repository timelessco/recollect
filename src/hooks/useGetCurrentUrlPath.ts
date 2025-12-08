import { useRouter } from "next/router";

// gets current url path , eg if url is <origin>/everything , this hook will return everything
export default function useGetCurrentUrlPath() {
	const router = useRouter();

	const currentPath = router.asPath.split("/")[1] || null;

	return currentPath;
}
