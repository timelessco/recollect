import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm, type SubmitHandler } from "react-hook-form";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import {
	signInWithOauth,
	signInWithOtp,
	verifyOtp,
} from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import Spinner from "../../components/spinner";
import GoogleLoginIcon from "../../icons/googleLoginIcon";
import LaterpadLogo from "../../icons/laterpadLogo";
import { useSupabaseSession } from "../../store/componentStore";
import {
	buttonDarkClassName,
	buttonLightClassName,
	grayInputClassName,
} from "../../utils/commonClassNames";
import { ALL_BOOKMARKS_URL, EMAIL_CHECK_PATTERN } from "../../utils/constants";
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
		const { error } = await verifyOtp(email, otp, supabase);
		setIsLoading(false);

		if (error) {
			errorToast(error.message);
		} else {
			window.location.pathname = `/${ALL_BOOKMARKS_URL}`;
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
									onChange={(event) => setEmail(event.target.value)}
									placeholder="Email"
								/>
								<button
									className={buttonDarkClassName}
									id="sign-in-button"
									type="submit"
								>
									{!isLoading ? "Login" : <Spinner />}
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
									onChange={(event) => setOtp(event.target.value)}
									placeholder="Enter OTP"
									value={otp}
								/>
								<button
									className={buttonDarkClassName}
									disabled={otp.length !== 6}
									onClick={handleVerifyOtp}
									type="submit"
								>
									{isLoading ? <Spinner /> : "Verify OTP"}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
			<ToastContainer />
		</>
	);
};

export default LoginPage;
