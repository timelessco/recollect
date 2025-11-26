import dynamic from "next/dynamic";

import "swagger-ui-react/swagger-ui.css";

import bookmarkAddApiSpec from "./api/v1/bookmarks/add/swagger";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

const ApiDocumentation = () => (
	<div className="h-screen w-full overflow-y-auto">
		<div className="container mx-auto p-4">
			<h1 className="mb-4 text-3xl font-bold">Recollect API Documentation</h1>
			<div className="swagger-ui-container">
				<SwaggerUI spec={bookmarkAddApiSpec} />
			</div>
		</div>
	</div>
);

export default ApiDocumentation;
