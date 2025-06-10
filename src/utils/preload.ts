/* eslint-disable @typescript-eslint/no-explicit-any */

(() => {
	// Patches common browser properties to mimic a real user environment
	const windowsPatch = (window: Window) => {
		// Fake 'chrome' object to bypass headless browser detection
		(window as any).chrome = {
			app: {
				isInstalled: false,
				InstallState: {
					DISABLED: "disabled",
					INSTALLED: "installed",
					NOT_INSTALLED: "not_installed",
				},
				RunningState: {
					CANNOT_RUN: "cannot_run",
					READY_TO_RUN: "ready_to_run",
					RUNNING: "running",
				},
			},
			loadTimes: () => {},
			csi: () => {},
		};

		// Suppress console logs and fake 'console.context'
		const consoleObject = globalThis.console as Console & {
			context?: () => void;
		};
		consoleObject.debug = () => {};
		consoleObject.log = () => {};
		consoleObject.context = () => {};

		// Patch navigator permissions
		if (window.navigator?.permissions?.query) {
			window.navigator.permissions.query = new Proxy(
				// eslint-disable-next-line @typescript-eslint/unbound-method
				window?.navigator.permissions.query,
				{
					apply: async (target, thisArgument, args: any[]) => {
						try {
							const result = await Reflect.apply(target, thisArgument, args);
							if (result?.state === "prompt") {
								Object.defineProperty(result, "state", { value: "denied" });
							}

							return result;
						} catch (error) {
							return await Promise.reject(error);
						}
					},
				},
			);
		}

		// Monkey-patch addEventListener to make events always "trusted"
		const proto = Element.prototype as any;
		proto._addEventListener = proto.addEventListener;

		proto.addEventListener = function (
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: AddEventListenerOptions | boolean,
		) {
			const wrappedListener = (event: Event) => {
				const fakeEvent = { ...event };
				(fakeEvent as any).isTrusted = true;

				if (typeof listener === "function") {
					listener(fakeEvent);
				} else {
					listener.handleEvent(fakeEvent);
				}
			};

			return proto._addEventListener.call(this, type, wrappedListener, options);
		};
	};

	const cloudflareClicker = (window: Window) => {
		if (
			window?.document &&
			window.location.host === "challenges.cloudflare.com"
		) {
			const targetSelector = "input[type=checkbox]";

			const observer = new MutationObserver((mutationsList) => {
				for (const mutation of mutationsList) {
					if (mutation.type === "childList") {
						const addedNodes = Array.from(mutation.addedNodes);
						for (const addedNode of addedNodes) {
							if (
								addedNode.nodeType === Node.ELEMENT_NODE &&
								addedNode instanceof HTMLElement
							) {
								const node =
									addedNode.querySelector<HTMLInputElement>(targetSelector);
								if (node?.parentElement) {
									node.parentElement.click();
								}
							}
						}
					}
				}
			});

			const observerOptions: MutationObserverInit = {
				childList: true,
				subtree: true,
			};

			observer.observe(
				window.document.documentElement || window.document,
				observerOptions,
			);
		}
	};

	// Run both patches
	windowsPatch(window);
	cloudflareClicker(window);
})();
