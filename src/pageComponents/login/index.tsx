import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ALL_BOOKMARKS_URL, SIGNUP_URL } from '../../utils/constants';
import {
  signInWithEmailPassword,
  signInWithOauth,
} from '../../async/supabaseCrudHelpers';
import { errorToast } from '../../utils/toastMessages';
import LaterpadLogo from '../../icons/laterpadLogo';
import GoogleLoginIcon from '../../icons/googleLoginIcon';

const LoginPage = () => {
  const router = useRouter();

  const supabase = useSupabaseClient();

  const session = useSession();

  useEffect(() => {
    if (session) router.push(`/${ALL_BOOKMARKS_URL}`);
  }, [session]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ email: string; password: string }>();
  const onSubmit: SubmitHandler<{ email: string; password: string }> = async (
    data
  ) => {
    const { error } = await signInWithEmailPassword(
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
      <div>
        <div className="sm:mx-auto sm:w-full sm:max-w-md flex items-center justify-center h-[calc(100vh-95px)]">
          <div className="w-[300px]">
            <div className="font-semibold text-2xl flex items-center w-full justify-center mb-[21px] leading-[28px]">
              <figure className="mr-[6px]">
                <LaterpadLogo />
              </figure>
              <p>laterpad</p>
            </div>
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
                Sign in
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
          </div>
        </div>
        <div className="fixed bottom-0 py-5 flex items-center justify-center w-full">
          <div className="flex w-[300px] items-center justify-between">
            <p className="text-custom-gray-1 font-[450] text-sm leading-4">
              Don’t have an account?
            </p>
            <a
              href={`/${SIGNUP_URL}`}
              className="font-[450] text-sm leading-4 text-custom-gray-1 py-[7px] px-[10px] bg-custom-gray-8 rounded-lg hover:bg-slate-200"
            >
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
