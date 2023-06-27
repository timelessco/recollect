export const options = (color: string) => [
	{
		label: "home",
		icon: () => (
			<div className="icon-svg-parent" style={{ color }}>
				<svg height="18" width="18">
					<use href="/sprite.svg#home" />
				</svg>
			</div>
		),
	},
	{
		label: "design",
		icon: () => (
			<div className="icon-svg-parent" style={{ color }}>
				<svg height="18" width="18">
					<use href="/sprite.svg#design" />
				</svg>
			</div>
		),
	},
	{
		label: "inspiration",
		icon: () => (
			<div className="icon-svg-parent" style={{ color }}>
				<svg height="18" width="18">
					<use href="/sprite.svg#inspiration" />
				</svg>
			</div>
		),
	},
	{
		label: "open-src",
		icon: () => (
			<div className="icon-svg-parent" style={{ color }}>
				<svg height="18" width="18">
					<use href="/sprite.svg#open-src" />
				</svg>
			</div>
		),
	},
	{
		label: "file",
		icon: () => (
			<div className="icon-svg-parent" style={{ color }}>
				<svg height="18" width="18">
					<use href="/sprite.svg#file" />
				</svg>
			</div>
		),
	},
	{
		label: "code",
		icon: () => (
			<div className="icon-svg-parent" style={{ color }}>
				<svg height="18" width="18">
					<use href="/sprite.svg#code" />
				</svg>
			</div>
		),
	},
	{
		label: "card",
		icon: () => (
			<div className="icon-svg-parent" style={{ color }}>
				<svg height="18" width="18">
					<use href="/sprite.svg#card" />
				</svg>
			</div>
		),
	},
];
