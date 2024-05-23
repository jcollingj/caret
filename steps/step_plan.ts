import { z } from "zod";
import { StepBase } from "./steps";
import OpenAI from "openai";
import fs from "fs";

// const data = JSON.parse(fs.readFileSync("../data.json", "utf8"));
const data = {
    openai_api_key: "",
};
const openai_api_key = data.openai_api_key;

const openai_client = new OpenAI({ apiKey: openai_api_key, dangerouslyAllowBrowser: true });

const step_plan_input_schema = z.object({
    user_input: z.string(),
});
const node_schema = z.object({
    id: z.number(),
    type: z.string(),
    input: z.string(),
    dependencies: z.array(z.number()),
});

const step_plan_output_schema = z.object({
    nodes: z.array(node_schema),
});
export type StepPlanInput = z.infer<typeof step_plan_input_schema>;
export type StepPlanOutput = z.infer<typeof step_plan_output_schema>;

export class StepPlan extends StepBase {
    constructor() {
        super("step_plan", step_plan_input_schema, step_plan_output_schema);
    }
    async process(input: StepPlanInput): Promise<StepPlanOutput> {
        // We just use this to validate the input matches the schema.
        // This will throw a run time error if it does not match. But we still use input.example
        // When actually using the values on input because that will give us the typescript support
        const validated_input = this.validate_input(input);
        // Assuming token_counter is accessible via this.token_counter
        const output = await this.plan(input);
        // Similarly, this shouldn't change the value at all.
        // It just will throw run time errors if it doesn't confirm to the schema
        const validatedOutput = this.validate_output(output);
        return validatedOutput;
    }
    private async plan(input: StepPlanInput) {
        const system_message_content = `
        You are a helpful assisstant that is responding to a user input. All of these inputs are determined that they can be answered directly without further research or anything.
        So just respond as expected.

        # Rules:
        - If you are asked to remember something indicate that you will try your best but your memory is failable.
        `;
        const user_message_content = `
        **You are a planning agent.**
        You will provide a user prompt, and then you will write out the plan. The output should be a DAG in **JSON format** that we can then iterate over.


        # User Input
        ${input.user_input}

        Your job is to assess the options that are available and then create a plan. The plan is going to be a **DAG (Directed Acyclic Graph)**, and each node will have:

        - **ID**: The identifier for the node.
        - **Step**: The step that the node is going to be used on.
        - **Input**: The input for the node, which you will write based on the user prompt.

        ## Available Types of Steps:
        - google_search:
            Description: Searches on Google and returns a list of links
            Input: text query
        - get_websites_content:
            Description: Get's the content from a website
            Input: A string of link(s). Leave this as an empty string when writing the plan. Or populate it if user has specified the link already

        - display_content:
            Description: Creates 

        
        ## Output Format:
        - Your output should be formatted as a DAG.


        ### Example:
        User Input: What are the best coffee shops in Denver?
        const dag_plan = {
            nodes: [
                {
                    id: 1,
                    type: "google_search",
                    input: "Best coffee shops in Denver."
                    dependencies: []
                },
                {
                    id: 2,
                    type: "get_websites_content",
                    input: "",
                    dependencies: [1],
                },
                {
                    id: 3,
                    type: "display_content",
                    input: "",
                    dependencies: [2]
                }
            ]
        };

        # User Input
        ${input.user_input}

        
        `;

        const system_message = { role: "system", content: system_message_content };
        const user_message = { role: "user", content: user_message_content };
        const conversation = [system_message, user_message];
        const tools = [
            {
                type: "function",
                function: {
                    name: "execute_plan",
                    description: "A function that executes the plan",
                    parameters: {
                        type: "object",
                        properties: {
                            nodes: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        type: { type: "string" },
                                        dependencies: {
                                            type: "array",
                                            items: { type: "number", nullable: true },
                                        },
                                        input: { type: "string" },
                                        output: { type: "string", nullable: true },
                                    },
                                    required: ["id", "type", "dependencies", "input"],
                                },
                            },
                        },
                        required: ["nodes"],
                    },
                },
            },
        ];
        const tool_choice = {
            type: "function",
            function: { name: "execute_plan" },
        };

        let model = "gpt-4o";
        const params = {
            messages: conversation,
            model: model,
            tools,
            tool_choice,
        };
        const completion = await openai_client.chat.completions.create(params);
        console.log(completion);
        const function_call_args = completion.choices[0].message.tool_calls[0].function.arguments;
        const arugments_parsed = JSON.parse(function_call_args);
        return arugments_parsed;
    }
}

// const input: StepPlanInput = {
//     user_input:
//         "Okay, please do some research on the Internet for the best coffee shops in the Denver area. So search for them and then extract out their content.",
// };
// const step: StepPlan = new StepPlan();
// const output: StepPlanOutput = await step.process(input);
// console.log(output);
