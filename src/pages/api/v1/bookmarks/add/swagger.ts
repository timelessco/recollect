import { type OpenAPIV3 } from "openapi-types";

const bookmarkAddApiSpec: OpenAPIV3.Document = {
	openapi: "3.0.0",
	info: {
		title: "Recollect Bookmark Add APIs",
		version: "1.0.0",
		description:
			"APIs for adding bookmarks with metadata, screenshots and remaining data",
	},
	tags: [
		{
			name: "Add Bookmark Flow",
			description:
				"Main endpoint and its sub-tasks for adding bookmarks. Endpoints marked with 🔒 require internal API key authentication.",
		},
	],
	paths: {
		"/api/v1/bookmarks/add/data": {
			post: {
				operationId: "addBookmark",
				summary: "Add a new bookmark",
				description:
					"Main endpoint to add a new bookmark. Orchestrates min-data, screenshot and remaining data processing.",
				tags: ["Add Bookmark Flow"],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["url", "category_id", "update_access"],
								properties: {
									url: {
										type: "string",
										description: "URL to bookmark",
									},
									category_id: {
										type: "number",
										description: "Category ID to add bookmark to",
									},
									update_access: {
										type: "boolean",
										description: "Whether user has update access",
									},
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Bookmark added successfully",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/SuccessResponse",
								},
							},
						},
					},
					"400": {
						description: "Invalid request body",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"401": {
						description: "Unauthorized",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"403": {
						description: "Forbidden - User does not have update access",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"409": {
						description: "Bookmark already exists in category",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"500": {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/bookmarks/add/tasks/min-data": {
			post: {
				operationId: "addBookmarkMinData",
				summary: "Add minimum bookmark data",
				description:
					"[Internal Task] Adds initial bookmark data with basic metadata and checks for duplicates",
				tags: ["Add Bookmark Flow"],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["url", "category_id", "update_access"],
								properties: {
									url: {
										type: "string",
										description: "URL to bookmark",
									},
									category_id: {
										type: "number",
										description: "Category ID to add bookmark to",
									},
									update_access: {
										type: "boolean",
										description: "Whether user has update access",
									},
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Minimum bookmark data added successfully",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/SuccessResponse",
								},
							},
						},
					},
					"400": {
						description: "Invalid request body",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/bookmarks/add/tasks/screenshot": {
			post: {
				operationId: "addBookmarkScreenshot",
				summary: "Add bookmark screenshot (🔒 Requires API Key)",
				description:
					"[Background Task] Captures and stores screenshot of the bookmarked URL. **Authentication Required:** Include INTERNAL_API_KEY in x-api-key header or as Bearer token in Authorization header.",
				tags: ["Add Bookmark Flow"],
				security: [
					{
						ApiKeyAuth: [],
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["id", "url", "userId"],
								properties: {
									id: {
										type: "number",
										description: "Bookmark ID",
									},
									url: {
										type: "string",
										description: "URL to capture screenshot of",
									},
									userId: {
										type: "string",
										description:
											"User ID (required for service key authentication)",
									},
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Screenshot added successfully",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/SuccessResponse",
								},
							},
						},
					},
					"400": {
						description: "Invalid request body",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"401": {
						description: "Unauthorized - Invalid or missing API key",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"500": {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/bookmarks/add/tasks/remaining": {
			post: {
				operationId: "addBookmarkRemainingData",
				summary: "Add remaining bookmark data (🔒 Requires API Key)",
				description:
					"[Background Task] Processes and stores remaining bookmark data including images and metadata. **Authentication Required:** Include INTERNAL_API_KEY in x-api-key header or as Bearer token in Authorization header.",
				tags: ["Add Bookmark Flow"],
				security: [
					{
						ApiKeyAuth: [],
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["id", "url", "userId"],
								properties: {
									id: {
										type: "number",
										description: "Bookmark ID",
									},
									url: {
										type: "string",
										description: "Bookmark URL",
									},
									favIcon: {
										type: "string",
										nullable: true,
										description: "Favicon URL",
									},
									userId: {
										type: "string",
										description:
											"User ID (required for service key authentication)",
									},
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Remaining data added successfully",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/SuccessResponse",
								},
							},
						},
					},
					"400": {
						description: "Invalid request body",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"401": {
						description: "Unauthorized - Invalid or missing API key",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"404": {
						description: "Bookmark not found",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"500": {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
				},
			},
		},
		"/api/v1/bookmarks/add/tasks/queue-consumer": {
			post: {
				operationId: "processBookmarkQueue",
				summary: "Process bookmark queue (🔒 Requires API Key)",
				description:
					"[Background Task] Processes messages from the bookmark queue. Called by cron job/worker. **Authentication Required:** Include INTERNAL_API_KEY in x-api-key header or as Bearer token in Authorization header. Reads up to 10 messages and processes them in batch.",
				tags: ["Add Bookmark Flow"],
				security: [
					{
						ApiKeyAuth: [],
					},
				],
				responses: {
					"200": {
						description: "Queue processing completed",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: {
											type: "boolean",
										},
										message: {
											type: "string",
										},
										processedCount: {
											type: "number",
											description: "Total messages processed",
										},
										archivedCount: {
											type: "number",
											description: "Successfully completed jobs",
										},
										failedCount: {
											type: "number",
											description: "Failed jobs (remain in queue)",
										},
										results: {
											type: "array",
											items: {
												type: "object",
												properties: {
													messageId: {
														type: "number",
													},
													bookmarkId: {
														type: "number",
													},
													success: {
														type: "boolean",
													},
													archived: {
														type: "boolean",
													},
													screenshotSuccess: {
														type: "boolean",
													},
													remainingDataSuccess: {
														type: "boolean",
													},
													error: {
														type: "string",
													},
												},
											},
										},
									},
								},
							},
						},
					},
					"401": {
						description: "Unauthorized - Invalid or missing API key",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
					"500": {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ErrorResponse",
								},
							},
						},
					},
				},
			},
		},
	},
	components: {
		securitySchemes: {
			ApiKeyAuth: {
				type: "apiKey",
				in: "header",
				name: "x-api-key",
				description:
					"Internal API key for authenticating background job endpoints. Include the key in the x-api-key header or as a Bearer token in the Authorization header.",
			},
		},
		schemas: {
			SingleListData: {
				type: "object",
				properties: {
					id: {
						type: "string",
						description: "Unique identifier for the bookmark",
					},
					url: {
						type: "string",
						description: "Bookmarked URL",
					},
					title: {
						type: "string",
						nullable: true,
						description: "Bookmark title",
					},
					description: {
						type: "string",
						nullable: true,
						description: "Bookmark description",
					},
					ogImage: {
						type: "string",
						nullable: true,
						description: "Open Graph image URL",
					},
					category_id: {
						type: "number",
						description: "Category ID",
					},
					meta_data: {
						type: "object",
						description: "Additional metadata",
						properties: {
							isOgImagePreferred: {
								type: "boolean",
							},
							mediaType: {
								type: "string",
							},
							favIcon: {
								type: "string",
								nullable: true,
							},
							iframeAllowed: {
								type: "boolean",
							},
							screenshot: {
								type: "string",
								nullable: true,
							},
							isPageScreenshot: {
								type: "boolean",
							},
						},
					},
				},
			},
			SuccessResponse: {
				type: "object",
				properties: {
					data: {
						type: "array",
						items: {
							$ref: "#/components/schemas/SingleListData",
						},
					},
					error: {
						type: "string",
						nullable: true,
					},
					message: {
						type: "string",
						nullable: true,
					},
				},
			},
			ErrorResponse: {
				type: "object",
				properties: {
					data: {
						type: "string",
						nullable: true,
					},
					error: {
						type: "string",
					},
					message: {
						type: "string",
						nullable: true,
					},
				},
			},
		},
	},
};

export default bookmarkAddApiSpec;
