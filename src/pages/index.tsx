import { type GetServerSideProps, type NextPage } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

import Dashboard from "../pageComponents/dashboard";

const Home: NextPage = () => <Dashboard />;

// export const getServerSideProps: GetServerSideProps = async (context) => {
// 	// Create authenticated Supabase Client
// 	const supabase = createServerSupabaseClient(context);
// 	// Check if we have a session
// 	const {
// 		data: { session },
// 	} = await supabase.auth.getSession();

// 	if (!session)
// 		return {
// 			redirect: {
// 				destination: "/login",
// 				permanent: false,
// 			},
// 		};

// 	return {
// 		props: {
// 			initialSession: session,
// 			user: session.user,
// 		},
// 	};
// };

export default Home;
