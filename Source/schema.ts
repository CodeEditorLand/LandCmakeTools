import * as path from "path";
import Ajv, { ValidateFunction } from "ajv";

import { fs } from "./pr";
import { thisExtensionPath } from "./util";

export async function loadSchema(filepath: string): Promise<ValidateFunction> {
	const schema_path = path.isAbsolute(filepath)
		? filepath
		: path.join(thisExtensionPath(), filepath);
	const schema_data = JSON.parse((await fs.readFile(schema_path)).toString());
	return new Ajv({ allErrors: true }).compile(schema_data);
}
