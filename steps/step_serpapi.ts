import { getJson } from "serpapi";

const SERP_API_KEY = "";

// So we have this do the search and return the titles and links.
// And then the next one receives that as input for the search.
// And the output from that is a function call to create a document.
// Those all get grouped together as a single output. And then we synthesize that??
// The inputs and outputs get created as groups and are tagged as such. So we can see what's going on.
// Working through the RAG actually shows that.

export async function google_search(user_input: string, num_results: number = 10) {
    const skip_list = ["yelp", "reddit", "amazon", "youtube"];
    const response = await getJson({
        engine: "google",
        api_key: SERP_API_KEY, // Get your API_KEY from https://serpapi.com/manage-api-key
        q: user_input,
    });

    const { organic_results } = response;
    const links = [];

    for (let i = 0; i < organic_results.length && links.length < num_results; i++) {
        const { link } = organic_results[i];
        if (!skip_list.some((skip) => link.includes(skip))) {
            links.push(link);
        }
    }

    return links;
}
