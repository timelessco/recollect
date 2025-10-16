import { useEffect, useState } from "react";
import Image from "next/image";

export const Switch = () => {
	const [theme, setTheme] = useState<"dark" | "light" | "system">("system");

	// Initialize from localStorage or system preference
	useEffect(() => {
		const storedTheme = localStorage.getItem("theme");

		if (storedTheme === "dark") {
			setTheme("dark");
			document.documentElement.classList.add("dark");
		} else if (storedTheme === "light") {
			setTheme("light");
			document.documentElement.classList.remove("dark");
		} else {
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			setTheme("system");
			document.documentElement.classList.toggle("dark", prefersDark);
		}
	}, []);

	// Sync state changes
	useEffect(() => {
		if (theme === "dark") {
			localStorage.setItem("theme", "dark");
			document.documentElement.classList.add("dark");
		} else if (theme === "light") {
			localStorage.setItem("theme", "light");
			document.documentElement.classList.remove("dark");
		} else {
			localStorage.setItem("theme", "system");
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			document.documentElement.classList.toggle("dark", prefersDark);
		}
	}, [theme]);

	return (
		<div className="grid max-w-[700px] grid-cols-3 gap-[10px]">
			{[
				{ value: "light" as const, label: "Light", bgClass: "bg-white" },
				{ value: "system" as const, label: "System", bgClass: "bg-[#f3f3f3]" },
				{ value: "dark" as const, label: "Dark", bgClass: "bg-black" },
			].map(({ value, label, bgClass }) => {
				const selected = theme === value;
				return (
					<label
						className="relative h-[108px] cursor-pointer rounded-lg shadow-sm transition-all hover:shadow-md"
						key={value}
					>
						<input
							checked={theme === value}
							className="peer sr-only"
							name="theme"
							onChange={() => setTheme(value)}
							type="radio"
							value={value}
						/>
						{/* Outer card with dynamic border */}
						<div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-gray-100 transition-all duration-200 peer-checked:border-[1px] peer-checked:border-gray-800">
							<div
								className={`h-[calc(100%-40px)] ${bgClass} p-3 transition-colors`}
							>
								<div
									className={`mb-3 flex items-center gap-1 ${
										value === "dark" ? "opacity-40" : "opacity-30"
									}`}
								>
									<div className="h-1.5 w-1.5 rounded-full bg-red-500" />
									<div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
									<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
								</div>
								<div className="mb-3 flex items-center gap-2">
									<Image
										alt="Recollect"
										className={`h-3 w-3 ${value === "dark" ? "invert" : ""}`}
										height={12}
										src="logo.png"
										width={12}
									/>
									<div
										className={`text-xs font-semibold text-black ${
											value === "dark" ? "text-white" : "text-black"
										}`}
									>
										Recollect
									</div>
								</div>
							</div>
							<div className="mt-auto flex items-center justify-between rounded-b-lg bg-plain-color px-3 py-2 peer-checked:bg-gray-800 peer-checked:text-plain-color">
								<span className="text-sm font-medium text-plain-reverse-color">
									{label}
								</span>
							</div>
						</div>
						<span className="pointer-events-none absolute bottom-2 right-3 inline-flex h-5 w-5 items-center justify-center">
							<span
								className={`h-4 w-4 rounded-full border-2 transition-colors duration-200 ease-out ${
									selected ? "border-4 border-gray-800" : "border-gray-400"
								}`}
							/>
						</span>
					</label>
				);
			})}
		</div>
	);
};
