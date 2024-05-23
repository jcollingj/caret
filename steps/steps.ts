import { z } from "zod";
import {
    ChatCompletionsFunctionToolDefinition,
    ChatRequestMessage,
    ChatRequestUserMessage,
    ChatRequestSystemMessage,
    ChatCompletionsFunctionToolCall,
} from "@azure/openai";

export abstract class StepBase {
    input_schema: z.ZodSchema<any>;
    output_schema: z.ZodSchema<any>;
    step_name: string;

    constructor(step_name: string, input_schema: z.ZodSchema<any>, output_schema: z.ZodSchema<any>) {
        this.input_schema = input_schema;
        this.output_schema = output_schema;
        this.step_name = step_name;
    }

    // Placeholder for the abstract process method`
    abstract process(input: any): any;

    validate_input(input: any) {
        try {
            return this.input_schema.parse(input);
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Construct a detailed error message
                const errorDetails = error.issues
                    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                    .join(", ");
                console.error("Failed Input here:");
                console.error(input);
                throw new Error(`Validation failed: ${errorDetails}`);
            } else {
                // Re-throw if it's not a ZodError
                throw error;
            }
        }
    }

    validate_output(output: any) {
        try {
            return this.output_schema.parse(output);
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Construct a detailed error message similar to validate_input
                const errorDetails = error.issues
                    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                    .join(", ");
                console.error("Failed Output here:");
                console.error(output);
                throw new Error(`Validation failed: ${errorDetails}`);
            } else {
                // Re-throw if it's not a ZodError
                throw error;
            }
        }
    }
}
