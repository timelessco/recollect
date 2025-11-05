import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import {
	signInWithOauth,
	signInWithOtp,
	verifyOtp,
} from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import { Spinner } from "../../components/spinner";
import GoogleLoginIcon from "../../icons/googleLoginIcon";
import LaterpadLogo from "../../icons/laterpadLogo";
import { useSupabaseSession } from "../../store/componentStore";
import { grayInputClassName } from "../../utils/commonClassNames";
import { ALL_BOOKMARKS_URL, EMAIL_CHECK_PATTERN } from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast } from "../../utils/toastMessages";

const LoginPage = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [step, setStep] = useState<"email" | "initial" | "otp">("initial");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");

	const router = useRouter();
	const supabase = createClient();
	const session = useSupabaseSession((state) => state.session);

	useEffect(() => {
		if (session?.user) {
			void router.push(`/${ALL_BOOKMARKS_URL}`);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [session]);

	const handleSendOtp = async () => {
		if (!EMAIL_CHECK_PATTERN.test(email)) {
			errorToast("Please enter a valid email");
			return;
		}

		setIsLoading(true);
		const { error } = await signInWithOtp(email, supabase);
		setIsLoading(false);

		if (error) {
			errorToast(error.message);
		} else {
			setStep("otp");
		}
	};

	const handleVerifyOtp = async () => {
		if (!otp || otp.length !== 6) {
			errorToast("Please enter a valid 6-digit OTP");
			return;
		}

		setIsLoading(true);
		const { error } = await verifyOtp(email, otp, supabase);
		setIsLoading(false);

		if (error) {
			errorToast(error.message);
		} else {
			void router.push(`/${ALL_BOOKMARKS_URL}`);
		}
	};

	const renderPrimaryButton = () => {
		switch (step) {
			case "initial":
				return (
					<button
						className="flex h-[30px] w-full justify-center rounded-lg bg-gray-alpha-100 py-[7.5px] text-[13px] font-medium leading-[15px] text-gray-950 hover:bg-gray-300"
						onClick={() => setStep("email")}
						type="button"
					>
						Continue with Email
					</button>
				);
			case "email":
				return (
					<Input
						className="block w-[300px] appearance-none rounded-lg border-none border-transparent bg-gray-alpha-100 px-[10px] py-[7px] text-sm font-normal leading-4 text-gray-900 outline-none placeholder:text-sm placeholder:font-normal placeholder:text-gray-600 focus:border-transparent focus:ring-0"
						errorText=""
						isError={false}
						onChange={(event) => setEmail(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								void handleSendOtp();
							}
						}}
						placeholder="Enter your email"
						type="email"
						value={email}
					/>
				);
			case "otp":
				return (
					<Input
						className={grayInputClassName}
						errorText=""
						isError={false}
						onChange={(event) => setOtp(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								void handleVerifyOtp();
							}
						}}
						placeholder="Enter OTP"
						value={otp}
					/>
				);
			default:
				return null;
		}
	};

	const renderSecondaryButton = () => {
		switch (step) {
			case "initial":
				return (
					<button
						className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-gray-950 py-[7px] text-[13px] font-medium leading-[15px] text-gray-0 shadow-custom-2 hover:bg-gray-700"
						onClick={() => signInWithOauth("google", supabase)}
						tabIndex={0}
						type="button"
					>
						<figure className="mr-[6px]">
							<GoogleLoginIcon />
						</figure>
						<p>Continue with Google</p>
					</button>
				);
			case "email":
				return (
					<button
						className="relative flex w-full cursor-pointer items-center justify-center rounded-lg bg-gray-950 py-[7px] text-[13px] font-medium leading-[15px] text-gray-0 shadow-custom-2 hover:bg-gray-700"
						onClick={handleSendOtp}
						type="button"
					>
						<span className={`${isLoading ? "opacity-0" : "opacity-100"}`}>
							Continue with Email
						</span>
						{isLoading && (
							<span className="absolute inset-0 flex items-center justify-center">
								<Spinner className="h-3 w-3" />
							</span>
						)}
					</button>
				);
			case "otp":
				return (
					<button
						className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-gray-950 py-[7px] text-[13px] font-medium leading-[15px] text-gray-0 shadow-custom-2 hover:bg-gray-700"
						disabled={isLoading || otp.length !== 6}
						onClick={handleVerifyOtp}
						type="button"
					>
						<span className={`${isLoading ? "opacity-0" : "opacity-100"}`}>
							Verify Email
						</span>
						{isLoading && (
							<span className="absolute inset-0 flex items-center justify-center">
								<Spinner className="h-3 w-3" />
							</span>
						)}
					</button>
				);
			default:
				return null;
		}
	};

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
							{renderPrimaryButton()}
							{renderSecondaryButton()}
						</div>
					</div>
				</div>
			</div>
			<ToastContainer />
		</>
	);
};

export default LoginPage;
