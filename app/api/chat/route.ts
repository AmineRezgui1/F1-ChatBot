import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { NextRequest, NextResponse } from "next/server";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_Collection,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GEMINI_API_KEY
} = process.env;

const gemini = new ChatGoogleGenerativeAI({
    apiKey: GEMINI_API_KEY,
    model: "gemini-1.5-flash"
});

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: GEMINI_API_KEY,
    model: "embedding-001",
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();
        const latestMessage = messages[messages?.length - 1]?.content;
        let docContext = "";

        const embedding = await embeddings.embedQuery(latestMessage);

        try {
            const collection = await db.collection(ASTRA_DB_Collection);
            const cursor = collection.find(null, {
                sort: {
                    $vector: embedding,
                },
                limit: 10
            });
            const documents = await cursor.toArray();
            const docMap = documents?.map(doc => doc.text);
            docContext = JSON.stringify(docMap);

        } catch (err) {
            console.log("Error querying DB:", err);
            docContext = "";
        }

        const systemMessage = {
            role: "system",
            content: `You are an AI assistant who knows everything about Formula One.
            Use the below context to augment what you know about Formula One racing.
            The context will provide you with the most recent page data from Wikipedia,
            the official F1 website and others.

            If the context doesn't include the information you need, answer based on your
            existing knowledge and don't mention the source of your information or
            what the context does or doesn't include.
            Format responses using markdown where applicable and don't return images.
            --------------------
            START CONTEXT
            ${docContext}
            END CONTEXT
            --------------------
            Question: ${latestMessage}
            --------------------`
        };

        const response = await gemini.invoke([systemMessage, ...messages]);
        return NextResponse.json({
            message: response.content
        });

    } catch (err) {
        console.error("Error in API route:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}