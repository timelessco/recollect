import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ToastContainer } from "react-toastify";

import { signInWithOtp } from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import { Spinner } from "../../components/spinner";
import LaterpadLogo from "../../icons/laterpadLogo";
import { EMAIL_CHECK_PATTERN } from "../../utils/constants";
import { createClient } from "../../utils/supabaseClient";
import { errorToast } from "../../utils/toastMessages";

const EmailSection = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [email, setEmail] = useState("");
	const router = useRouter();
	const supabase = createClient();

	const handleSendOtp = async () => {
		if (!EMAIL_CHECK_PATTERN.test(email)) {
			errorToast("Please enter a valid email");
			return;
		}

		await router.replace({
			pathname: "/email",
			query: { email },
		});

		setIsLoading(true);
		const { error } = await signInWithOtp(email, supabase);
		setIsLoading(false);

		if (error) {
			errorToast(error.message);
		} else {
			await router.push(`/otp?email=${encodeURIComponent(email)}`);
		}
	};

	useEffect(() => {
		if (router.query.email && typeof router.query.email === "string") {
			setEmail(router.query.email);
		}
	}, [router.query.email]);

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
					{/* Email Input */}
					<div className="space-y-4">
						<Input
							autoFocus
							className="block w-full appearance-none rounded-lg border-none border-transparent bg-gray-alpha-100 px-[10px] py-[7px] text-sm font-normal leading-4 text-gray-900 outline-none placeholder:text-sm placeholder:font-normal placeholder:text-gray-600 focus:border-transparent focus:ring-0"
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
						<button
							className="relative flex w-full cursor-pointer items-center justify-center rounded-lg bg-gray-950 py-[7px] text-13 font-medium leading-[15px] text-gray-0 shadow-custom-2 hover:bg-gray-700"
							disabled={isLoading}
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
					</div>
				</div>
			</div>
			<ToastContainer />
		</>
	);
};

export default EmailSection;
