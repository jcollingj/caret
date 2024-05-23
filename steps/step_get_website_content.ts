import Instructor from "@instructor-ai/instructor";
import { z } from "zod";
import { StepBase } from "./steps";
import OpenAI from "openai";
import fs from "fs";
import { response } from "express";

// const data = JSON.parse(fs.readFileSync("../data.json", "utf8"));
const data = {
    openai_api_key: "",
};
const openai_api_key = data.openai_api_key;

const openai_client = new OpenAI({ apiKey: openai_api_key, dangerouslyAllowBrowser: true });

const client = Instructor({
    client: openai_client,
    mode: "TOOLS",
});

const step_get_website_content_input_schema = z.object({
    list_of_websites_string: z.string(),
});
const step_get_website_input_parsed_schema = z.object({ urls: z.array(z.string()) });

const step_get_website_content_output_schema = z.object({
    text_nodes: z.array(z.string()),
});
export type StepGetWebsiteContentInput = z.infer<typeof step_get_website_content_input_schema>;
export type StepGetWebsiteContentOutput = z.infer<typeof step_get_website_content_output_schema>;

export class StepGetWebsiteContent extends StepBase {
    constructor() {
        super("step_plan", step_get_website_content_input_schema, step_get_website_content_output_schema);
    }
    async process(input: StepGetWebsiteContentInput): Promise<StepGetWebsiteContentOutput> {
        // We just use this to validate the input matches the schema.
        // This will throw a run time error if it does not match. But we still use input.example
        // When actually using the values on input because that will give us the typescript support
        const validated_input = this.validate_input(input);
        // Assuming token_counter is accessible via this.token_counter
        const output = await this.get_website_content(input);
        // Similarly, this shouldn't change the value at all.
        // It just will throw run time errors if it doesn't confirm to the schema
        const validatedOutput = this.validate_output(output);
        return validatedOutput;
    }
    private async get_website_content(input: StepGetWebsiteContentInput) {
        const content = input.list_of_websites_string;
        const urls_list = await client.chat.completions.create({
            messages: [{ role: "user", content }],
            model: "gpt-4o",
            response_model: {
                schema: step_get_website_input_parsed_schema,
                name: "Urls",
            },
        });
        async function fetch_urls_content(urls: string[]) {
            const fetch_promises = urls.map(async (url) => {
                // const proxy_url = '"http://127.0.0.1:8000/get_website_in_markdown"';
                const md_url = `https://r.jina.ai/${url}`;
                const response = await fetch(md_url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ url }),
                });
                const text = await response.text();
                return `${url}\n${text}`;
            });

            // /console.log(await)

            const contents = await Promise.all(fetch_promises);
            console.log(contents.length);
            console.log("Length of content here");
            return contents;
        }
        const final_output = await fetch_urls_content(urls_list.urls);
        const output: StepGetWebsiteContentOutput = {
            text_nodes: final_output,
        };
        return output;
    }
}
