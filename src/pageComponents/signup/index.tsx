import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/router';
import { SubmitHandler, useForm } from 'react-hook-form';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  ALL_BOOKMARKS_URL,
  EMAIL_CHECK_PATTERN,
  SIGNIN_URL,
} from '../../utils/constants';
import {
  signInWithOauth,
  signUpWithEmailPassword,
} from '../../async/supabaseCrudHelpers';
import { errorToast } from '../../utils/toastMessages';
import GoogleLoginIcon from '../../icons/googleLoginIcon';
import LaterpadLogoBlack from '../../icons/laterpadLogoBlack';
import Input from '../../components/atoms/input';
import {
  bottomBarButton,
  bottomBarText,
  buttonDarkClassName,
  buttonLightClassName,
  grayInputClassName,
} from '../../utils/commonClassNames';
import { useState } from 'react';
import Spinner from '../../components/spinner';

const SignUp = () => {
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = useSupabaseClient();

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
    const { error } = await signUpWithEmailPassword(
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
                {isLoading ? <Spinner /> : 'Sign up'}
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
            <div className="fixed bottom-0 py-5 flex items-center justify-center">
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
