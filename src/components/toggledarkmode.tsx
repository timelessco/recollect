import { useEffect, useLayoutEffect, useState } from "react";
import Image from "next/image";

export const Switch = () => {
	const [theme, setTheme] = useState<"dark" | "light" | "system">("system");
	// Use useLayoutEffect to prevent flash of incorrect theme
	useLayoutEffect(() => {
		const storedTheme = localStorage.getItem("theme");
		if (storedTheme === "dark" || storedTheme === "light") {
			setTheme(storedTheme);
			document.documentElement.classList.toggle("dark", storedTheme === "dark");
		} else {
			setTheme("system");
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			document.documentElement.classList.toggle("dark", prefersDark);
		}
	}, []);

	// Handle theme changes
	useEffect(() => {
		// Skip initial render
		if (!theme) {
			return;
		}

		if (theme === "system") {
			localStorage.removeItem("theme");
			const prefersDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			document.documentElement.classList.toggle("dark", prefersDark);
		} else {
			localStorage.setItem("theme", theme);
			document.documentElement.classList.toggle("dark", theme === "dark");
		}
	}, [theme]);

	// Don't render until theme is determined
	if (theme === null) {
		// or a loading spinner
		return null;
	}

	return (
		<div className="pt-10">
			<p className="pb-2 text-[14px] font-medium leading-[115%] text-gray-900">
				Appearance
			</p>
			<p className="pb-4 text-[14px] font-normal leading-[150%] text-gray-800">
				Switch between light, dark, or system theme.
			</p>
			<div className="grid max-w-[700px] grid-cols-3 gap-[10px]">
				{[
					{ value: "light" as const, label: "Light" },
					{ value: "system" as const, label: "System" },
					{ value: "dark" as const, label: "Dark" },
				].map(({ value, label }) => {
					const selected = theme === value;

					return (
						<label
							className="shadow-xs relative h-[108px] cursor-pointer rounded-lg transition-all hover:shadow-md"
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
							{/* Card background */}
							<div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-transparent transition-colors duration-200 peer-checked:border-gray-800">
								{/* PREVIEW AREA */}
								{value === "system" ? (
									<div className="flex h-[calc(100%-40px)]">
										{/* Light half */}
										<div className="flex-1 bg-white p-3">
											<div className="mb-3 flex items-center gap-1 opacity-30">
												<div className="h-1.5 w-1.5 rounded-full bg-red-500" />
												<div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
												<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
											</div>
											<div className="flex items-center gap-2">
												<Image
													alt="Logo"
													className="h-3 w-3"
													height={12}
													loader={(source) => source.src}
													src="logo.png"
													width={12}
												/>
											</div>
										</div>
										{/* Divider */}
										<div className="w-px bg-gray-300" />
										{/* Dark half */}
										<div className="flex-1 bg-black p-3">
											<div className="mb-3 flex items-center gap-1 opacity-40">
												<div className="h-1.5 w-1.5 rounded-full bg-red-500" />
												<div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
												<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
											</div>
											<div className="flex items-center gap-2">
												<Image
													alt="Logo"
													className="h-3 w-3 invert"
													height={12}
													loader={(source) => source.src}
													src="logo.png"
													width={12}
												/>
											</div>
										</div>
									</div>
								) : (
									<div
										className={`h-[calc(100%-40px)] p-3 ${
											value === "dark" ? "bg-black" : "bg-white"
										}`}
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
										<div className="flex items-center gap-2">
											<Image
												alt="Logo"
												className={`h-3 w-3 ${
													value === "dark" ? "invert" : ""
												}`}
												height={12}
												loader={(source) => source.src}
												src="logo.png"
												width={12}
											/>
											<span
												className={`text-xs font-semibold ${
													value === "dark" ? "text-white" : "text-black"
												}`}
											>
												Recollect
											</span>
										</div>
									</div>
								)}
								{/* Label bar */}
								<div className="peer-checked:text-plain mt-auto flex items-center justify-between rounded-b-lg bg-gray-100 px-3 py-2 peer-checked:bg-gray-800">
									<span className="text-plain-reverse text-sm font-medium">
										{label}
									</span>
								</div>
							</div>
							{/* Selector circle */}
							<span className="pointer-events-none absolute bottom-2 right-3 inline-flex h-5 w-5 items-center justify-center">
								<span
									className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ease-out ${
										selected
											? "border-gray-800 ring-2 ring-gray-800"
											: "border-gray-400"
									}`}
								/>
							</span>
						</label>
					);
				})}
			</div>
		</div>
	);
};
