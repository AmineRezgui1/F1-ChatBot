import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import "dotenv/config"
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

type similarityMetric = "cosine" | "euclidean" | "dot_product"

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_Collection,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GEMINI_API_KEY
} = process.env;

const gemini = new ChatGoogleGenerativeAI({
    apiKey: GEMINI_API_KEY,
    model: "gemini-pro"
});

const f1Data = [
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://www.formula1.com/en/latest',
    'https://www.formula1.com/en/racing/2023.html',
    'https://www.formula1.com/en/racing/2022.html',
    'https://www.formula1.com/en/racing/2021.html',
    'https://www.formula1.com/en/racing/2020.html',
    'https://www.formula1.com/en/racing/2019.html',
    'https://www.formula1.com/en/racing/2018.html',
    'https://en.wikipedia.org/wiki/List_of_Formula_One_drivers',
    'https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions',
    'https://www.formula1.com/en/results/2025/races',
    'https://www.formula1.com/en/results',
    'https://www.forbes.com/sites/brettknight/2024/12/10/formula-1s-highest-paid-drivers-2024',
    'https://motorsporttickets.com/blog/f1-driver-salaries-how-much-formula-1-drivers-earn',
    'https://en.wikipedia.org/wiki/2025_Formula_One_World_Championship'
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE })

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
})


const embedding = new GoogleGenerativeAIEmbeddings({
    apiKey: GEMINI_API_KEY,
    model: "embedding-001"
});

const createCollection = async (similarityMetric: similarityMetric = "dot_product") => {
    try {
        const res = await db.createCollection(ASTRA_DB_Collection, {
            vector: {
                dimension: 768,
                metric: similarityMetric
            }
        })
        console.log("Collection created ", res)
    } catch (error) {
        if (error.message?.includes("already exists")) {
            console.log("Collection already exists, continuing...")
        } else {
            throw error;
        }
    }
}

const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_Collection)
    for await (const url of f1Data) {
        console.log(`Processing: ${url}`);
        const content = await scrapepage(url)
        if (!content) {
            console.log(`Skipping ${url} - no content`);
            continue;
        }

        const chunks = await splitter.splitText(content)
        for await (const chunk of chunks) {
            if (chunk.trim().length < 50) continue;

            const vector = await embedding.embedQuery(chunk);
            const res = await collection.insertOne({
                $vector: vector,
                text: chunk,
            })
            console.log("Inserted doc with id ", res)
        }
    }
}


const scrapepage = async (url: string) => {
    try {
        const loader = new PuppeteerWebBaseLoader(url, {
            launchOptions: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'] // Added for stability
            },
            gotoOptions: {
                waitUntil: "domcontentloaded",
                timeout: 30000 // Added timeout
            },
            evaluate: async (page, browser) => {
                const result = await page.evaluate(() => document.body.innerText || document.body.textContent)
                await browser.close()
                return result
            }
        })
        const content = await loader.scrape()
        return content?.trim() || ''
    } catch (error) {
        console.error(`Error scraping ${url}:`, error)
        return ''
    }
}

createCollection().then(() => loadSampleData()).catch(console.error)