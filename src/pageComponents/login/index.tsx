import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  ALL_BOOKMARKS_URL,
  EMAIL_CHECK_PATTERN,
  SIGNUP_URL,
} from '../../utils/constants';
import {
  signInWithEmailPassword,
  signInWithOauth,
} from '../../async/supabaseCrudHelpers';
import { errorToast } from '../../utils/toastMessages';
import LaterpadLogo from '../../icons/laterpadLogo';
import GoogleLoginIcon from '../../icons/googleLoginIcon';
import Input from '../../components/atoms/input';
import Spinner from '../../components/spinner';
import {
  bottomBarButton,
  bottomBarText,
  buttonDarkClassName,
  buttonLightClassName,
  grayInputClassName,
} from '../../utils/commonClassNames';

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const supabase = useSupabaseClient();

  const session = useSession();

  useEffect(() => {
    if (session) router.push(`/${ALL_BOOKMARKS_URL}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    // reset,
  } = useForm<{ email: string; password: string }>();
  const onSubmit: SubmitHandler<{ email: string; password: string }> = async (
    data
  ) => {
    setIsLoading(true);
    const { error } = await signInWithEmailPassword(
      data?.email,
      data?.password,
      supabase
    );
    setIsLoading(false);

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
              <Input
                {...register('email', {
                  required: {
                    value: true,
                    message: 'Please enter email',
                  },
                  pattern: {
                    value: EMAIL_CHECK_PATTERN,
                    message: 'Please enter valid email',
                  },
                })}
                placeholder="Email"
                id="email"
                className={grayInputClassName}
                isError={errors?.email ? true : false}
                errorText={errors?.email?.message || ''}
              />
              <Input
                {...register('password', {
                  required: {
                    value: true,
                    message: 'Please enter password',
                  },
                })}
                placeholder="Password"
                id="password"
                className={grayInputClassName}
                isError={errors?.password ? true : false}
                errorText={errors?.password?.message || ''}
              />

              <button type="submit" className={buttonDarkClassName}>
                {!isLoading ? 'Sign in' : <Spinner />}
              </button>

              <div
                onClick={() => signInWithOauth('google', supabase)}
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
        <div className="fixed bottom-0 py-5 flex items-center justify-center w-full">
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
