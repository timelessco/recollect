import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ToastContainer } from "react-toastify";

import { verifyOtp } from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import { Spinner } from "../../components/spinner";
import LaterpadLogo from "../../icons/laterpadLogo";
import { grayInputClassName } from "../../utils/commonClassNames";
import { ALL_BOOKMARKS_URL } from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast } from "../../utils/toastMessages";

const OtpSection = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [otp, setOtp] = useState("");
	const router = useRouter();
	const supabase = createClient();
	const { email } = router.query;

	useEffect(() => {
		if (!email) {
			void router.push("/login");
		}
	}, [email, router]);

	const handleVerifyOtp = async () => {
		if (otp?.length !== 6) {
			errorToast("Please enter a valid 6-digit OTP");
			return;
		}

		if (typeof email !== "string") {
			return;
		}

		setIsLoading(true);
		const { error } = await verifyOtp(email, otp, supabase);
		setIsLoading(false);

		if (error) {
			errorToast(error.message);
		} else {
			await router.push(`/${ALL_BOOKMARKS_URL}`);
		}
	};

	if (!email) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner className="h-8 w-8" />
			</div>
		);
	}

	return (
		<>
			<div className="flex h-[calc(100vh-95px)] items-center justify-center sm:mx-auto sm:w-full sm:max-w-md">
				<div className="w-[300px]">
					{/* Header */}
					<div className="mb-[21px] flex w-full items-center justify-center text-2xl font-semibold leading-[28px] tracking-[0.24px]">
						<figure className="mr-[6px]">
							<LaterpadLogo />
						</figure>
						<p className="text-plain-reverse-color">recollect</p>
					</div>
					{/* OTP Input */}
					<div className="space-y-4">
						<Input
							className={grayInputClassName}
							errorText=""
							inputMode="numeric"
							isError={false}
							onChange={(event) => setOtp(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									void handleVerifyOtp();
								}
							}}
							pattern="\d*"
							placeholder="Enter OTP"
							value={otp}
						/>
						<button
							className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-gray-950 py-[7px] text-center text-13 font-medium leading-[15px] text-gray-0 shadow-custom-2 hover:bg-gray-700"
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
					</div>
				</div>
			</div>
			<ToastContainer />
		</>
	);
};

export default OtpSection;
