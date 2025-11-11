import { useEffect } from "react";
import { useRouter } from "next/router";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import { signInWithOauth } from "../../async/supabaseCrudHelpers";
import GoogleLoginIcon from "../../icons/googleLoginIcon";
import LaterpadLogo from "../../icons/laterpadLogo";
import { useSupabaseSession } from "../../store/componentStore";
import { ALL_BOOKMARKS_URL } from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";

const LoginPage = () => {
	const router = useRouter();
	const supabase = createClient();
	const session = useSupabaseSession((state) => state.session);

	useEffect(() => {
		if (session?.user) {
			void router.push(`/${ALL_BOOKMARKS_URL}`);
		}
	}, [session, router]);

	return (
		<>
			<div>
				<div className="flex h-[calc(100vh-95px)] items-center justify-center sm:mx-auto sm:w-full sm:max-w-md">
					<div className="w-[300px]">
						{/* Header */}
						<div className="mb-[21px] flex w-full items-center justify-center text-2xl font-semibold leading-[28px] tracking-[0.24px]">
							<figure className="mr-[6px]">
								<LaterpadLogo />
							</figure>
							<p className="text-plain-reverse-color">recollect</p>
						</div>
						{/* Core Interaction */}
						<div className="flex flex-col items-center justify-center space-y-4">
							<button
								className="flex h-[30px] w-full justify-center rounded-lg bg-gray-alpha-100 py-[7.5px] text-13 font-medium leading-[15px] text-gray-950 hover:bg-gray-300"
								onClick={async () => await router.push("/email")}
								type="button"
							>
								Continue with Email
							</button>
							<button
								className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-gray-950 py-[7px] text-13 font-medium leading-[15px] text-gray-0 shadow-custom-2 hover:bg-gray-700"
								onClick={async () => await signInWithOauth("google", supabase)}
								type="button"
							>
								<figure className="mr-[6px]">
									<GoogleLoginIcon />
								</figure>
								Continue with Google
							</button>
						</div>
					</div>
				</div>
			</div>
			<ToastContainer />
		</>
	);
};

export default LoginPage;
