import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import {
  signInWithEmailPassword,
  signInWithOauth,
} from "../../async/supabaseCrudHelpers";
import Input from "../../components/atoms/input";
import Spinner from "../../components/spinner";
import GoogleLoginIcon from "../../icons/googleLoginIcon";
import LaterpadLogo from "../../icons/laterpadLogo";
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
import { errorToast } from "../../utils/toastMessages";

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const supabase = useSupabaseClient();

  const session = useSession();

  useEffect(() => {
    if (session) router.push(`/${ALL_BOOKMARKS_URL}`)?.catch(() => {});
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
  }> = async data => {
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
      router?.push(`/${ALL_BOOKMARKS_URL}`)?.catch(() => {});
    }
  };

  return (
    <>
      <div>
        <div className="flex h-[calc(100vh-95px)] items-center justify-center sm:mx-auto sm:w-full sm:max-w-md">
          <div className="w-[300px]">
            <div className="mb-[21px] flex w-full items-center justify-center text-2xl font-semibold leading-[28px]">
              <figure className="mr-[6px]">
                <LaterpadLogo />
              </figure>
              <p>laterpad</p>
            </div>
            <form
              className="flex flex-col items-center justify-center space-y-4"
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
                {!isLoading ? "Sign in" : <Spinner />}
              </button>

              <div
                role="button"
                tabIndex={0}
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
          </div>
        </div>
        <div className="fixed bottom-0 flex w-full items-center justify-center py-5">
          <div className="flex w-[300px] items-center justify-between">
            <p className={bottomBarText}>Don’t have an account?</p>
            <a href={`/${SIGNUP_URL}`} className={bottomBarButton}>
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
