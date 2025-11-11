import path from "node:path";
import { $ } from "execa";
import fsExtra from "fs-extra";

import { vet } from "./utils/try";

const __dirname = import.meta.dirname;

type CSpellConfig = {
	[key: string]: unknown;
	words?: string[];
};

async function readCspellConfig(filePath: string): Promise<CSpellConfig> {
	const [readError, readResult] = await vet(
		async () => await fsExtra.readFile(filePath, "utf8"),
	);
	if (readError) {
		throw new Error(`Failed to read cspell config ${filePath}`, {
			cause: readError,
		});
	}

	const [parseError, parseResult] = vet(
		() => JSON.parse(readResult) as CSpellConfig,
	);
	if (parseError) {
		throw new Error(`Failed to parse cspell config ${filePath}`, {
			cause: parseError,
		});
	}

	return parseResult;
}

async function writeCspellConfig(
	filePath: string,
	config: CSpellConfig,
): Promise<void> {
	const [writeError] = await vet(
		async () =>
			await fsExtra.writeFile(
				filePath,
				`${JSON.stringify(config, undefined, "\t")}\n`,
			),
	);

	if (writeError) {
		throw new Error(`Failed to write cspell config ${filePath}`, {
			cause: writeError,
		});
	}
}

async function updateWordsInConfig(
	filePath: string,
	words: string[],
): Promise<void> {
	const config = await readCspellConfig(filePath);
	config.words = words;
	await writeCspellConfig(filePath, config);
}

async function updateCspellWords(): Promise<void> {
	const cspellPath = path.join(__dirname, "..", "cspell.json");

	// Clear existing words
	await updateWordsInConfig(cspellPath, []);

	// Run cspell command and get output
	const [cspellError, cspellResult] = await vet(async () => {
		const result = await $({
			reject: false,
		})`cspell --gitignore --cache --no-progress --no-summary --dot --words-only --unique .`;
		if (result.stderr) {
			throw new Error("Failed to run cspell command", {
				cause: result.stderr,
			});
		}

		return result.stdout
			.trim()
			.split("\n")
			.toSorted((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
	});

	if (cspellError) {
		throw new Error("Failed to run cspell command", {
			cause: cspellError,
		});
	}

	// Update with new words
	await updateWordsInConfig(cspellPath, cspellResult);
}

await updateCspellWords();
