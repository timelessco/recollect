import { type NextApiResponse } from "next";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
	RunnablePassthrough,
	RunnableSequence,
} from "@langchain/core/runnables";
import {
	ChatGoogleGenerativeAI,
	GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";

import { type NextApiRequest } from "../../../../../types/apiTypes";
import { createServiceClient } from "../../../../../utils/supabaseClient";

const formatDocumentsAsString = (documents: Array<{ pageContent: string }>) =>
	documents.map((document) => document?.pageContent).join("\n\n");

// NOTE: This is currently put on hold. The LLM is giving correct data response but need to ask the right question. As this is a hassle we are putting it on hold

/**
 * This api is for the AI chat. If use asks a question it will reply based on the users data
 *
 * @param {{ query: string }} request the question to be asked
 * @param {{ data: string }} response the answer from the LLM
 */
export default async function handler(
	request: NextApiRequest<{ query: string }>,
	response: NextApiResponse<{ data: string }>,
) {
	// supabase client
	const client = createServiceClient();

	// Initialize the LLM to use to answer the question.
	const model = new ChatGoogleGenerativeAI({
		model: "gemini-1.5-flash-latest",
		maxOutputTokens: 2_048,
		apiKey: process.env.GOOGLE_GEMINI_TOKEN,
	});

	// existing vector store
	const embeddings = new GoogleGenerativeAIEmbeddings({
		model: "embedding-001",
		apiKey: process.env.GOOGLE_GEMINI_TOKEN,
	});

	const vectorStore = new SupabaseVectorStore(embeddings, {
		client,
		tableName: "documents",
	});

	const vectorStoreRetriever = vectorStore.asRetriever();

	// Create a system & human prompt for the chat model
	const SYSTEM_TEMPLATE = ` In this context there is data called bookmarks. This is data that is uploaded by users through an app called Recollect. This data can be either links, tweets , file, images or documents and this is determined my the type attribute in the data. 
  
  If the type is tweet then the bookmark is a tweet from twitter
  If the type is bookmark then the bookmark is a link
  If the type contains image text then the bookmark is a file
  If the type contains any file types like pdf, csv etc then the bookmark is a file
   
  You need to answer based on this context. The data has title, description, type, url, user_id, id and after you answer you need to also return the url from the data in the context given.
----------------
{context}`;

	const prompt = ChatPromptTemplate.fromMessages([
		["system", SYSTEM_TEMPLATE],
		["human", "{question}"],
	]);

	const chain = RunnableSequence.from([
		{
			context: vectorStoreRetriever.pipe(formatDocumentsAsString),
			question: new RunnablePassthrough(),
		},
		prompt,
		model,
		// parser,
		new StringOutputParser(),
	]);

	const answer = await chain.invoke(request?.query?.question);

	response.status(200).send({ data: answer });
}
