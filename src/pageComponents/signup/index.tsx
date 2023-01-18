import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { SubmitHandler, useForm } from 'react-hook-form';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ALL_BOOKMARKS_URL, SIGNIN_URL } from '../../utils/constants';
import {
  signInWithOauth,
  signUpWithEmailPassword,
} from '../../async/supabaseCrudHelpers';
import { errorToast } from '../../utils/toastMessages';
import GoogleLoginIcon from '../../icons/googleLoginIcon';
import LaterpadLogoBlack from '../../icons/laterpadLogoBlack';

const SignUp = () => {
  const router = useRouter();
  const supabase = useSupabaseClient();

  const {
    register,
    handleSubmit,
    // formState,
    // reset,
  } = useForm<{ email: string; password: string }>();
  const onSubmit: SubmitHandler<{ email: string; password: string }> = async (
    data
  ) => {
    const { error } = await signUpWithEmailPassword(
      data?.email,
      data?.password,
      supabase
    );

    if (error) {
      errorToast(error?.message);
    } else {
      router?.push(`/${ALL_BOOKMARKS_URL}`);
    }
  };

  return (
    <>
      <div className="flex h-screen sign-up-parent">
        <div className="w-1/2 flex items-center justify-end pr-[140px]">
          <div className="w-[374px]">
            <figure>
              <LaterpadLogoBlack />
            </figure>
            <p className="text-black font-semibold text-8xl leading-[110px]">
              laterpad
            </p>
            <p className=" text-black font-semibold text-40 leading-[46px] tracking-[-0.005em]">
              Life happens, save it.
            </p>
          </div>
        </div>
        <div className="w-1/2 flex items-center justify-start pl-[140px]">
          <div className="w-[300px]">
            <form
              className="flex flex-col justify-center items-center space-y-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <input
                {...register('email', {
                  required: true,
                })}
                placeholder="Email"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-[300px] bg-custom-gray-8 appearance-none border-none text-sm leading-4 text-custom-gray-3 rounded-lg px-[10px] py-[7px] border-transparent focus:border-transparent focus:ring-0"
              />
              <input
                {...register('password', {
                  required: true,
                })}
                placeholder="Password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-[300px] bg-custom-gray-8 appearance-none border-none text-sm leading-4 text-custom-gray-3 rounded-lg px-[10px] py-[7px] border-transparent focus:border-transparent focus:ring-0"
              />

              <button
                type="submit"
                className="flex w-full justify-center rounded-lg bg-custom-gray-5 text-[13px] font-medium leading-[15px] text-white py-[7.5px] hover:bg-slate-800"
              >
                Sign up
              </button>

              <div
                onClick={() => signInWithOauth('google', supabase)}
                className="flex cursor-pointer w-full justify-center items-center rounded-lg bg-white text-[13px] font-medium leading-[15px] text-custom-gray-1 py-[7.5px] hover:bg-slate-100 shadow-custom-2"
              >
                <figure className="mr-[6px]">
                  <GoogleLoginIcon />
                </figure>
                <p>Continue with Google</p>
              </div>
            </form>
            <div className="fixed bottom-0 py-5 flex items-center justify-center">
              <div className="flex w-[300px] items-center justify-between">
                <p className="text-custom-gray-1 font-[450] text-sm leading-4">
                  Already have an account ?
                </p>
                <a
                  href={`/${SIGNIN_URL}`}
                  className="font-[450] text-sm leading-4 text-custom-gray-1 py-[7px] px-[10px] bg-custom-gray-8 rounded-lg hover:bg-slate-200"
                >
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
