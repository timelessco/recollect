import Error from "next/error";
import * as Sentry from "@sentry/nextjs";

const CustomErrorComponent = (props: { statusCode: number }) => (
	<Error statusCode={props.statusCode} />
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
CustomErrorComponent.getInitialProps = async (contextData: any) => {
	// In case this is running in a serverless function, await this in order to give Sentry
	// time to send the error before the lambda exits
	await Sentry.captureUnderscoreErrorException(contextData);

	// This will contain the status code of the response
	return await Error.getInitialProps(contextData);
};

export default CustomErrorComponent;
