/* eslint-disable id-length */
/* eslint-disable unicorn/prevent-abbreviations */
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm, type SubmitHandler } from "react-hook-form";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import {
	signInWithOauth,
	signInWithOtp,
} from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import Spinner from "../../components/spinner";
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
	const [isOtpStep, setIsOtpStep] = useState(false);
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");

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
	} = useForm<{ email: string; password?: string }>();

	const onSubmit: SubmitHandler<{
		email: string;
		password?: string;
	}> = async (data) => {
		setIsLoading(true);
		const { error } = await signInWithOtp(data?.email, supabase);
		setIsLoading(false);

		if (error) {
			errorToast(error?.message);
		} else {
			setEmail(data.email);
			setIsOtpStep(true);
		}
	};

	// Step 2: verify OTP (new)
	const handleVerifyOtp = async () => {
		if (!otp || !email) {
			errorToast("Please enter OTP");
			return;
		}

		setIsLoading(true);
		const { error } = await supabase.auth.verifyOtp({
			email,
			token: otp,
			type: "magiclink",
		});
		setIsLoading(false);

		if (error) {
			errorToast(error.message);
		} else {
			void router.push(`/${ALL_BOOKMARKS_URL}`);
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
						{!isOtpStep ? (
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
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Email"
								/>
								{/* password field removed for OTP flow */}
								<button
									className={buttonDarkClassName}
									id="sign-in-button"
									type="submit"
								>
									{!isLoading ? "Send OTP" : <Spinner />}
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
						) : (
							<div className="flex flex-col items-center justify-center space-y-4">
								<Input
									className={grayInputClassName}
									errorText=""
									isError={false}
									onChange={(e) => setOtp(e.target.value)}
									placeholder="Enter OTP"
									value={otp}
								/>
								<button
									className={buttonDarkClassName}
									disabled={isLoading}
									onClick={handleVerifyOtp}
									type="button"
								>
									{isLoading ? <Spinner /> : "Verify OTP"}
								</button>
							</div>
						)}
						<div className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-center py-5">
							<div className="flex items-center justify-center gap-2">
								<p className={bottomBarText}>Don’t have an account?</p>
								<a className={bottomBarButton} href={`/${SIGNUP_URL}`}>
									Sign up
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

export default LoginPage;
