import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm, type SubmitHandler } from "react-hook-form";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import {
	signInWithEmailPassword,
	signInWithOauth,
} from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import { SearchLoader } from "../../components/search-loader";
import GoogleLoginIcon from "../../icons/googleLoginIcon";
import LaterpadLogo from "../../icons/laterpadLogo";
import { useSupabaseSession } from "../../store/componentStore";
import {
	bottomBarButton,
	bottomBarText,
	buttonDarkClassName,
	buttonLightClassName,
	grayInputClassName,
} from "../../utils/commonClassNames";
import {
	ALL_BOOKMARKS_URL,
	EMAIL_CHECK_PATTERN,
	SIGNUP_URL,
} from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast } from "../../utils/toastMessages";

const LoginPage = () => {
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const supabase = createClient();

	const session = useSupabaseSession((state) => state.session);

	useEffect(() => {
		if (session?.user) void router.push(`/${ALL_BOOKMARKS_URL}`);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session]);

	const {
		register,
		handleSubmit,
		formState: { errors },
		// reset,
	} = useForm<{ email: string; password: string }>();
	const onSubmit: SubmitHandler<{
		email: string;
		password: string;
	}> = async (data) => {
		setIsLoading(true);
		const { error } = await signInWithEmailPassword(
			data?.email,
			data?.password,
			supabase,
		);
		setIsLoading(false);

		if (error) {
			errorToast(error?.message);
		} else {
			void router?.push(`/${ALL_BOOKMARKS_URL}`);
		}
	};

	return (
		<>
			<div>
				<div className="flex h-[calc(100vh-95px)] items-center justify-center sm:mx-auto sm:w-full sm:max-w-md">
					<div className="w-[300px]">
						<div className="mb-[21px] flex w-full items-center justify-center text-2xl font-semibold leading-[28px] tracking-[0.24px]">
							<figure className="mr-[6px]">
								<LaterpadLogo />
							</figure>
							<p>recollect</p>
						</div>
						<form
							className="flex flex-col items-center justify-center space-y-4"
							onSubmit={handleSubmit(onSubmit)}
						>
							<Input
								{...register("email", {
									required: {
										value: true,
										message: "Please enter email",
									},
									pattern: {
										value: EMAIL_CHECK_PATTERN,
										message: "Please enter valid email",
									},
								})}
								className={grayInputClassName}
								errorText={errors?.email?.message ?? ""}
								id="email"
								isError={Boolean(errors?.email)}
								placeholder="Email"
							/>
							<Input
								{...register("password", {
									required: {
										value: true,
										message: "Please enter password",
									},
								})}
								className={grayInputClassName}
								errorText={errors?.password?.message ?? ""}
								id="password"
								isError={Boolean(errors?.password)}
								placeholder="Password"
								type="password"
							/>
							<button
								className={`${buttonDarkClassName} items-center`}
								id="sign-in-button"
								type="submit"
							>
								{!isLoading ? (
									<div className="text-white">Sign in</div>
								) : (
									<SearchLoader
										className="h-3 w-3 animate-spin"
										style={{ color: "white" }}
									/>
								)}
							</button>
							<div
								className={buttonLightClassName}
								onClick={() => {
									(async () => {
										await signInWithOauth("google", supabase);
									})();
								}}
								onKeyDown={() => {}}
								role="button"
								tabIndex={0}
							>
								<figure className="mr-[6px]">
									<GoogleLoginIcon />
								</figure>
								<p>Continue with Google</p>
							</div>
						</form>
					</div>
				</div>
				<div className="fixed bottom-0 flex w-full items-center justify-center py-5">
					<div className="flex w-[300px] items-center justify-between">
						<p className={bottomBarText}>Don’t have an account?</p>
						<a className={bottomBarButton} href={`/${SIGNUP_URL}`}>
							Sign up
						</a>
					</div>
				</div>
			</div>
			<ToastContainer />
		</>
	);
};

export default LoginPage;
