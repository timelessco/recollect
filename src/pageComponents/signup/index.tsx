// /* eslint-disable unicorn/prevent-abbreviations */
// /* eslint-disable id-length */
// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import { useForm, type SubmitHandler } from "react-hook-form";
// import { ToastContainer } from "react-toastify";

// import "react-toastify/dist/ReactToastify.css";

// import {
// 	signInWithOauth,
// 	signUpWithEmailPassword,
// } from "../../async/supabaseCrudHelpers";
// import Input from "../../components/atoms/input";
// import Spinner from "../../components/spinner";
// import GoogleLoginIcon from "../../icons/googleLoginIcon";
// import LaterpadLogoBlack from "../../icons/laterpadLogoBlack";
// import { useSupabaseSession } from "../../store/componentStore";
// import {
// 	bottomBarButton,
// 	bottomBarText,
// 	buttonDarkClassName,
// 	buttonLightClassName,
// 	grayInputClassName,
// } from "../../utils/commonClassNames";
// import {
// 	ALL_BOOKMARKS_URL,
// 	EMAIL_CHECK_PATTERN,
// 	SIGNIN_URL,
// } from "../../utils/constants";
// import { createClient } from "../../utils/supabaseClient";
// import { errorToast } from "../../utils/toastMessages";

// const SignUp = () => {
// 	const [isLoading, setIsLoading] = useState(false);
// 	const [isOtpStep, setIsOtpStep] = useState(false);
// 	const [email, setEmail] = useState("");
// 	const [otp, setOtp] = useState("");

// 	const router = useRouter();
// 	const supabase = createClient();
// 	const session = useSupabaseSession((state) => state.session);

// 	useEffect(() => {
// 		if (session?.user) void router.push(`/${ALL_BOOKMARKS_URL}`);
// 		// eslint-disable-next-line react-hooks/exhaustive-deps
// 	}, [session]);

// 	const {
// 		register,
// 		handleSubmit,
// 		formState: { errors },
// 	} = useForm<{ email: string; password: string }>();
// 	const onSubmit: SubmitHandler<{
// 		email: string;
// 		password?: string;
// 	}> = async (data) => {
// 		setIsLoading(true);
// 		const { data: signUpData, error } = await signUpWithEmailPassword(
// 			data?.email,
// 			"data?.password",
// 			supabase,
// 		);
// 		setIsLoading(false);

// 		// this will be true if the user is authenticated
// 		const email_verified =
// 			signUpData?.user?.role !== "authenticated" &&
// 			signUpData?.user?.identities?.length === 0;

// 		if (error || email_verified) {
// 			errorToast(error?.message ?? "Failed to sign up. check your email");
// 		} else {
// 			setEmail(data.email);
// 			setIsOtpStep(true);
// 		}
// 	};

// 	const handleVerifyOtp = async () => {
// 		if (!otp || !email) {
// 			errorToast("Please enter OTP");
// 			return;
// 		}

// 		setIsLoading(true);
// 		const { error } = await supabase.auth.verifyOtp({
// 			email,
// 			token: otp,
// 			type: "signup",
// 		});
// 		setIsLoading(false);

// 		if (error) {
// 			errorToast(error.message);
// 		} else {
// 			void router.push(`/${ALL_BOOKMARKS_URL}`);
// 		}
// 	};

// 	return (
// 		<>
// 			<div className="sign-up-parent flex h-screen">
// 				<div className="flex w-1/2 items-center justify-end pr-[140px]">
// 					<div className="w-[397px]">
// 						<figure>
// 							<LaterpadLogoBlack />
// 						</figure>
// 						<p className="text-8xl font-semibold leading-[110px] tracking-[-2px] text-black">
// 							recollect
// 						</p>
// 						<p className="text-40 font-semibold leading-[46px] tracking-[-0.2px] text-black">
// 							Life happens, save it.
// 						</p>
// 					</div>
// 				</div>
// 				<div className="flex w-1/2 items-center justify-start pl-[140px]">
// 					<div className="w-[300px]">
// 						{!isOtpStep ? (
// 							<form
// 								className="flex flex-col items-center justify-center space-y-4"
// 								onSubmit={handleSubmit(onSubmit)}
// 							>
// 								<Input
// 									{...register("email", {
// 										required: { value: true, message: "Please enter email" },
// 										pattern: {
// 											value: EMAIL_CHECK_PATTERN,
// 											message: "Please enter valid email",
// 										},
// 									})}
// 									className={grayInputClassName}
// 									errorText={errors?.email?.message ?? ""}
// 									id="email"
// 									isError={Boolean(errors?.email)}
// 									onChange={(e) => setEmail(e.target.value)}
// 									placeholder="Email"
// 								/>
// 								{/* <Input
// 									{...register("password", {
// 										required: { value: true, message: "Please enter password" },
// 									})}
// 									className={grayInputClassName}
// 									errorText={errors?.password?.message ?? ""}
// 									id="password"
// 									isError={Boolean(errors?.password)}
// 									placeholder="Password"
// 									type="password"
// 								/> */}
// 								<button className={buttonDarkClassName} type="submit">
// 									{isLoading ? <Spinner /> : "Sign up"}
// 								</button>
// 								<div
// 									className={buttonLightClassName}
// 									onClick={() => {
// 										(async () => {
// 											await signInWithOauth("google", supabase);
// 										})()?.catch(() => { });
// 									}}
// 									onKeyDown={() => { }}
// 									role="button"
// 									tabIndex={0}
// 								>
// 									<figure className="mr-[6px]">
// 										<GoogleLoginIcon />
// 									</figure>
// 									<p>Continue with Google</p>
// 								</div>
// 							</form>
// 						) : (
// 							<div className="flex flex-col items-center justify-center space-y-4">
// 								<Input
// 									className={grayInputClassName}
// 									errorText=""
// 									isError={false}
// 									onChange={(e) => setOtp(e.target.value)}
// 									placeholder="Enter OTP"
// 									value={otp}
// 								/>
// 								<button
// 									className={buttonDarkClassName}
// 									disabled={isLoading}
// 									onClick={() => handleVerifyOtp()}
// 									type="button"
// 								>
// 									{isLoading ? <Spinner /> : "Verify Email"}
// 								</button>
// 							</div>
// 						)}
// 						<div className="fixed bottom-0 flex items-center justify-center py-5">
// 							<div className="flex w-[300px] items-center justify-between">
// 								<p className={bottomBarText}>Already have an account ?</p>
// 								<a className={bottomBarButton} href={`/${SIGNIN_URL}`}>
// 									Sign in
// 								</a>
// 							</div>
// 						</div>
// 					</div>
// 				</div>
// 			</div>
// 			<ToastContainer />
// 		</>
// 	);
// };

// export default SignUp;
