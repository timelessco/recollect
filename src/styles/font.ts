import { Inter } from "next/font/google";

// https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap%22%20rel=%22stylesheet
export const inter = Inter({
	display: "swap",
	subsets: ["latin"],
	// This variable is used in global.css to set the font family in --font-sans
	variable: "--font-inter",
});
