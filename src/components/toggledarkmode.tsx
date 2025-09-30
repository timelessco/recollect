import { useEffect, useState } from "react";

export const Switch = () => {
	const [darkMode, setDarkMode] = useState(false);

	// Initialize from localStorage or system preference
	useEffect(() => {
		const storedTheme = localStorage.getItem("theme");

		if (storedTheme === "dark") {
			setDarkMode(true);
			document.documentElement.classList.add("dark");
		} else if (storedTheme === "light") {
			setDarkMode(false);
			document.documentElement.classList.remove("dark");
		} else {
			// No preference saved -> follow system preference
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			setDarkMode(prefersDark);
			document.documentElement.classList.toggle("dark", prefersDark);
		}
	}, []);

	// Sync state changes -> localStorage + <html>
	useEffect(() => {
		if (darkMode) {
			localStorage.setItem("theme", "dark");
			document.documentElement.classList.add("dark");
		} else {
			localStorage.setItem("theme", "light");
			document.documentElement.classList.remove("dark");
		}
	}, [darkMode]);

	return (
		<label className="relative inline-block h-[24px] w-[48px] cursor-pointer text-[12px]">
			<input
				checked={darkMode}
				className="peer h-0 w-0 opacity-0"
				onChange={(event) => setDarkMode(event.target.checked)}
				type="checkbox"
			/>
			{/* Track */}
			<span className="absolute inset-0 rounded-[30px] bg-[#73c0fc] transition-colors peer-checked:bg-[var(--color-dark-gray-300)]" />
			{/* Knob */}
			<span className="absolute bottom-[3px] left-[3px] z-[2] h-[18px] w-[18px] rounded-full bg-[#e8e8e8] transition-transform duration-300 peer-checked:translate-x-6" />
			{/* Sun icon */}
			<span className="absolute left-[26px] top-0.5 flex h-5 w-5 items-center justify-center text-[color:var(--color-light-yellow-400)]">
				<svg className="h-4 w-4" viewBox="0 0 24 24">
					<circle cx="12" cy="12" fill="currentColor" r="5" />
					<g stroke="currentColor" strokeWidth="2">
						<line x1="12" x2="12" y1="1" y2="4" />
						<line x1="12" x2="12" y1="20" y2="23" />
						<line x1="4.22" x2="6.34" y1="4.22" y2="6.34" />
						<line x1="17.66" x2="19.78" y1="17.66" y2="19.78" />
						<line x1="1" x2="4" y1="12" y2="12" />
						<line x1="20" x2="23" y1="12" y2="12" />
						<line x1="4.22" x2="6.34" y1="19.78" y2="17.66" />
						<line x1="17.66" x2="19.78" y1="6.34" y2="4.22" />
					</g>
				</svg>
			</span>
			{/* Moon icon */}
			<span className="absolute left-1 top-0.5 z-[1] flex h-5 w-5 items-center justify-center text-white">
				<svg
					className="moon-tilt h-4 w-4"
					fill="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
				</svg>
			</span>
		</label>
	);
};
