import {
	extendZodWithOpenApi,
	OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent(
	"securitySchemes",
	"bearerAuth",
	{ type: "http", scheme: "bearer", bearerFormat: "JWT" },
);
