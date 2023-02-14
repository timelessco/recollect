import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useForm, type SubmitHandler } from "react-hook-form";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";

import {
  signInWithOauth,
  signUpWithEmailPassword,
} from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import Spinner from "../../components/spinner";
import GoogleLoginIcon from "../../icons/googleLoginIcon";
import LaterpadLogoBlack from "../../icons/laterpadLogoBlack";
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
import { errorToast } from "../../utils/toastMessages";

const SignUp = () => {
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = useSupabaseClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string; password: string }>();
  const onSubmit: SubmitHandler<{
    email: string;
    password: string;
  }> = async data => {
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
      router?.push(`/${ALL_BOOKMARKS_URL}`)?.catch(() => {});
    }
  };

  return (
    <>
      <div className="sign-up-parent flex h-screen">
        <div className="flex w-1/2 items-center justify-end pr-[140px]">
          <div className="w-[374px]">
            <figure>
              <LaterpadLogoBlack />
            </figure>
            <p className="text-8xl font-semibold leading-[110px] text-black">
              laterpad
            </p>
            <p className=" text-40 font-semibold leading-[46px] tracking-[-0.005em] text-black">
              Life happens, save it.
            </p>
          </div>
        </div>
        <div className="flex w-1/2 items-center justify-start pl-[140px]">
          <div className="w-[300px]">
            <form
              className="flex flex-col items-center justify-center space-y-4"
              // disabled as handleSubmit is part of react forms
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
                placeholder="Email"
                id="email"
                className={grayInputClassName}
                isError={!!errors?.email}
                errorText={errors?.email?.message || ""}
              />
              <Input
                {...register("password", {
                  required: {
                    value: true,
                    message: "Please enter password",
                  },
                })}
                placeholder="Password"
                id="password"
                className={grayInputClassName}
                isError={!!errors?.password}
                errorText={errors?.password?.message || ""}
              />
              <button type="submit" className={buttonDarkClassName}>
                {isLoading ? <Spinner /> : "Sign up"}
              </button>

              <div
                role="button"
                tabIndex={0}
                // onClick={() => void signInWithOauth("google", supabase)}
                onClick={() => {
                  (async () => {
                    await signInWithOauth("google", supabase);
                  })()?.catch(() => {});
                }}
                onKeyDown={() => {}}
                className={buttonLightClassName}
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
                <a href={`/${SIGNIN_URL}`} className={bottomBarButton}>
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
