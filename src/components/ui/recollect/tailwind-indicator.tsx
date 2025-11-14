// Forked when https://github.com/shadcn-ui/ui/blob/d6d4017b951782b5af9ca1187ad74d2de9268498/templates/next-template/components/tailwind-indicator.tsx
export function TailwindIndicator() {
	if (process.env.NODE_ENV === "production") {
		return null;
	}

	return (
		<div
			aria-hidden
			className="fixed bottom-1 left-1 z-50 flex size-6 items-center justify-center rounded-full bg-gray-800 pb-0.5 text-xs text-white"
		>
			<div className="block sm:hidden">xs</div>
			<div className="hidden sm:block md:hidden">sm</div>
			<div className="hidden md:block lg:hidden">md</div>
			<div className="hidden lg:block xl:hidden">lg</div>
			<div className="hidden xl:block 2xl:hidden">xl</div>
			<div className="hidden 2xl:block">2xl</div>
		</div>
	);
}
