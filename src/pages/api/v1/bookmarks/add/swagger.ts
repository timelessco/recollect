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
			description: "Main endpoint and its sub-tasks for adding bookmarks",
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
				summary: "Add bookmark screenshot",
				description:
					"[Internal Task] Captures and stores screenshot of the bookmarked URL",
				tags: ["Add Bookmark Flow"],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["id", "url"],
								properties: {
									id: {
										type: "string",
										description: "Bookmark ID",
									},
									url: {
										type: "string",
										description: "URL to capture screenshot of",
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
				},
			},
		},
		"/api/v1/bookmarks/add/tasks/remaining": {
			post: {
				operationId: "addBookmarkRemainingData",
				summary: "Add remaining bookmark data",
				description:
					"[Internal Task] Processes and stores remaining bookmark data including images and metadata",
				tags: ["Add Bookmark Flow"],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["id", "url"],
								properties: {
									id: {
										type: "string",
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
				},
			},
		},
	},
	components: {
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
