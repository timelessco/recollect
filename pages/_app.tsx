import '../styles/globals.css';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps: { ...pageProps } }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
