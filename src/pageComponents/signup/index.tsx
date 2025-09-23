import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm, type SubmitHandler } from "react-hook-form";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import {
	signInWithOauth,
	signUpWithEmailPassword,
} from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import { Spinner } from "../../components/search-loader";
import GoogleLoginIcon from "../../icons/googleLoginIcon";
import LaterpadLogoBlack from "../../icons/laterpadLogoBlack";
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
	SIGNIN_URL,
} from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast } from "../../utils/toastMessages";

const SignUp = () => {
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
	} = useForm<{ email: string; password: string }>();
	const onSubmit: SubmitHandler<{
		email: string;
		password: string;
	}> = async (data) => {
		setIsLoading(true);
		const { error } = await signUpWithEmailPassword(
			data?.email,
			data?.password,
			supabase,
		);
		setIsLoading(false);

		if (error) {
			errorToast(error?.message);
		} else {
			void router?.push(`/${ALL_BOOKMARKS_URL}`)?.catch(() => {});
		}
	};

	return (
		<>
			<div className="sign-up-parent flex h-screen">
				<div className="flex w-1/2 items-center justify-end pr-[140px]">
					<div className="w-[397px]">
						<figure>
							<LaterpadLogoBlack />
						</figure>
						<p className="text-8xl font-semibold leading-[110px] tracking-[-2px] text-black">
							recollect
						</p>
						<p className="text-40 font-semibold leading-[46px] tracking-[-0.2px] text-black">
							Life happens, save it.
						</p>
					</div>
				</div>
				<div className="flex w-1/2 items-center justify-start pl-[140px]">
					<div className="w-[300px]">
						<form
							className="flex flex-col items-center justify-center space-y-4"
							// disabled as handleSubmit is part of react forms
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
								className={`${buttonDarkClassName} flex items-center justify-center`}
								type="submit"
							>
								{isLoading ? (
									<Spinner
										className="h-3 w-3 animate-spin"
										style={{ color: "white" }}
									/>
								) : (
									"Sign up"
								)}
							</button>
							<div
								className={buttonLightClassName}
								// onClick={() => void signInWithOauth("google", supabase)}
								onClick={() => {
									(async () => {
										await signInWithOauth("google", supabase);
									})()?.catch(() => {});
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
						<div className="fixed bottom-0 flex items-center justify-center py-5">
							<div className="flex w-[300px] items-center justify-between">
								<p className={bottomBarText}>Already have an account ?</p>
								<a className={bottomBarButton} href={`/${SIGNIN_URL}`}>
									Sign in
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
			<ToastContainer />
		</>
	);
};

export default SignUp;
