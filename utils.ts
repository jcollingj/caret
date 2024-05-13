import { promises as fsPromises } from "fs";

import { parse } from "csv-parse/sync";

export async function append_to_csv(list: any[], filePath: string, wrapped_quotes: boolean = true) {
    let row;
    if (wrapped_quotes) {
        row = list
            .map((value) => {
                let stringValue = String(value);
                stringValue = stringValue.trim().replace(/[\r\n]+/g, "");

                // Check if the value is already correctly quoted
                if (!stringValue.startsWith('"') || !stringValue.endsWith('"')) {
                    // Escape internal quotes (not the first or last character)
                    let internalQuotedValue = stringValue.replaceAll('"', '""');
                    // Reconstruct the value with potentially escaped internal quotes
                    stringValue = internalQuotedValue;
                    // Ensure the value is correctly quoted externally
                    stringValue = `"${stringValue}"`;
                }
                return stringValue;
            })
            .join(",");
    } else {
        row = list.map(String).join(","); // Convert all values to string to avoid errors
    }
    // Use fsPromises.appendFile to return a promise that can be awaited
    await fsPromises.appendFile(filePath, `${row}\n`);
}
// export function csv_to_dict_list(filePath: string) {
//     const data = fs.readFileSync(filePath, "utf8");
//     const results = Papa.parse(data, { header: true, skipEmptyLines: true });
//     return results.data;
// }
export async function read_csv(filePath: string) {
    const file = Bun.file(filePath);
    const csvBuffer = await file.arrayBuffer();
    const csvText = new TextDecoder().decode(csvBuffer);
    const records = parse(csvText, {
        columns: true, // Automatically use the first row as headers
        skip_empty_lines: true,
        trim: true, // Trim spaces around values
    });
    return records;
}
export async function read_pipe_separated_file(file_path: string) {
    const file = Bun.file(file_path);
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const headers = lines[0].split("|");

    const data = lines.slice(1).map((line) => {
        const values = line.split("|");
        if (values.length !== headers.length) {
            throw new Error("Data row does not match header length");
        }
        const obj = headers.reduce((acc: { [key: string]: string }, header, index) => {
            acc[header] = values[index].trim();
            return acc;
        }, {});
        return obj;
    });

    return data;
}
async function parse_and_write_csv(inputFilePath: string, outputFilePath: string, headers: string[]) {
    const data = await read_csv(inputFilePath);
    const csvHeaders = Object.keys(data[0]);
    const filteredHeaders = csvHeaders.filter((header) => headers.includes(header));
    append_to_csv([filteredHeaders], outputFilePath);
    data.forEach((row) => {
        const rowData = filteredHeaders.map((header) => row[header]);
        append_to_csv([rowData], outputFilePath);
    });
}

export async function merge_csvs(file_path_a: string, file_path_b: string, merge_column: string, output_file: string) {
    const csv_a_records = await read_csv(file_path_a);
    const csv_b_records = await read_csv(file_path_b);

    const csv_b_indexed = csv_b_records.reduce((acc: any, record: any) => {
        acc[record[merge_column]] = record;
        return acc;
    }, {});

    const merged_records = csv_a_records.map((record_a: any) => {
        const record_b = csv_b_indexed[record_a[merge_column]] || {};
        const merged_record = { ...record_a };

        for (const key in record_b) {
            merged_record[key] = record_b[key] || "";
        }

        return merged_record;
    });

    // Assuming headers are to be extracted from the first record of each CSV
    const headers_a = Object.keys(csv_a_records[0]);
    const headers_b = Object.keys(csv_b_records[0]).filter((header) => !headers_a.includes(header));
    const merged_headers = [...headers_a, ...headers_b];

    // Writing merged records to CSV
    await append_to_csv(merged_headers, output_file);
    // Use a for...of loop to await each append_to_csv call
    for (const record of merged_records) {
        const rowData = merged_headers.map((header) => record[header] || "");
        await append_to_csv(rowData, output_file); // Await ensures each row is written in order
    }
}

export async function csv_parse_columns(inputFilePath: string, outputFilePath: string, columns: string[]) {
    const data = await read_csv(inputFilePath);
    const filteredHeaders = columns.filter((column) => Object.keys(data[0]).includes(column));
    append_to_csv([filteredHeaders], outputFilePath);
    data.forEach((row: any) => {
        const rowData = filteredHeaders.map((header) => row[header]);
        append_to_csv([rowData], outputFilePath);
    });
}

export async function read_and_write_first_10_lines(input_file: string, output_file: string) {
    const inputFile = Bun.file(input_file);
    const outputFile = Bun.file(output_file).writer();

    const inputText = await inputFile.text();
    const lines = inputText.split("\n").slice(0, 10);
    const first10Lines = lines.join("\n");

    await outputFile.write(first10Lines);
    await outputFile.end();
}
export async function read_and_write_x_lines(
    input_file: string,
    output_file: string,
    start_line: number,
    end_line: number
) {
    const inputFile = Bun.file(input_file);
    const outputFile = Bun.file(output_file).writer();

    const inputText = await inputFile.text();
    const lines = inputText.split("\n");
    const selectedLines = [lines[0], ...lines.slice(start_line, end_line + 1)].join("\n");

    await outputFile.write(selectedLines);
    await outputFile.end();
}
export async function convert_tsv_to_csv(
    inputFilePath: string,
    outputFilePath: string,
    known_row_length: number | null = null
): Promise<void> {
    try {
        // Read the input file
        const inputFile = await fs.promises.readFile(inputFilePath, { encoding: "utf8" });
        // Split the file content by new lines to get each row
        const rows = inputFile.split("\n");
        // Prepare a variable to hold the converted rows
        let csvContent = "";
        // Iterate over each row
        for (const row of rows) {
            if (row.trim().length === 0) {
                continue;
            }

            let values = row.split("\t");

            // If known_row_length is set and the current row has more values than expected
            if (known_row_length && values.length > known_row_length) {
                // Identify and reduce consecutive tabs
                let diff = values.length - known_row_length;
                while (diff > 0) {
                    // Find the longest sequence of empty strings (consecutive tabs)
                    let longestEmptySequenceIndex = -1;
                    let longestEmptySequenceLength = 0;

                    let currentSequenceLength = 0;
                    for (let i = 0; i < values.length; i++) {
                        if (values[i] === "") {
                            currentSequenceLength++;
                            if (currentSequenceLength > longestEmptySequenceLength) {
                                longestEmptySequenceLength = currentSequenceLength;
                                longestEmptySequenceIndex = i - currentSequenceLength + 1;
                            }
                        } else {
                            currentSequenceLength = 0;
                        }
                    }

                    // Reduce the longest sequence of empty strings by one
                    if (longestEmptySequenceIndex !== -1 && longestEmptySequenceLength > 1) {
                        values = [
                            ...values.slice(0, longestEmptySequenceIndex),
                            ...values.slice(longestEmptySequenceIndex + 1),
                        ];
                        diff--;
                    } else {
                        // Break if no reducible sequence is found to avoid infinite loop
                        break;
                    }
                }
            }

            // Map each value to ensure it is correctly quoted if not already, especially if it contains commas or newlines,
            // and remove all newline characters within the values. Adjust internal quoting and ensure proper external quoting.
            const quotedValues = values.map((value) => {
                // Trim the value and remove all newline characters within it
                value = value.trim().replace(/[\r\n]+/g, "");
                // Escape internal quotes (not the first or last character)
                let internalQuotedValue = value.replaceAll('"', '""');
                // Reconstruct the value with potentially escaped internal quotes
                value = internalQuotedValue;
                // Ensure the value is correctly quoted externally
                value = `"${value}"`;
                // if (!value.startsWith('"') && !value.endsWith('"')) {

                // }
                return value;
            });
            // Join the quoted values with commas to form a CSV row
            const csvRow = quotedValues.join(",");

            csvContent += `${csvRow}\n`;
        }
        // Write the converted CSV content to the output file
        await fs.promises.writeFile(outputFilePath, csvContent.trim()); // Use trim to remove the last newline added
        console.log(`Converted TSV to CSV: ${outputFilePath}`);
    } catch (error) {
        console.error("Error converting TSV to CSV:", error);
        throw error;
    }
}
import * as fs from "fs";

/**
 * Splits a text file into multiple chunks based on the specified number of lines per chunk.
 *
 * @param {string} inputFilePath - The path to the input text file.
 * @param {string} outputFileStructure - The structure for the output file names, without the chunk number.
 * @param {number} chunkSize - The number of lines each chunk file should contain, excluding the header.
 */
export async function split_text(inputFilePath: string, outputFileStructure: string, chunkSize: number) {
    try {
        // Read the entire file content
        const fileContent = fs.readFileSync(inputFilePath, { encoding: "utf8" });
        // Split the content into lines
        const lines = fileContent.split(/\r?\n/);
        // Extract the header
        const header = lines[0];
        // Initialize variables for processing chunks
        let chunkIndex = 1;
        let currentChunkLines = [];

        for (let i = 1; i < lines.length; i++) {
            // Start from 1 to skip the header
            currentChunkLines.push(lines[i]);
            // Check if the current chunk reached the chunkSize or it's the last record
            if (currentChunkLines.length === chunkSize || i === lines.length - 1) {
                // Generate the chunk file name
                const chunkFileName = `${outputFileStructure}_${chunkIndex}.csv`;
                // Prepare the chunk content by adding the header and joining the lines
                let chunkContent = header + "\n" + currentChunkLines.join("\n");
                // Write the chunk to a new file
                fs.writeFileSync(chunkFileName, chunkContent, { encoding: "utf8" });
                // Reset for the next chunk
                currentChunkLines = [];
                chunkIndex++;
            }
        }
    } catch (error) {
        console.error("Error splitting text file:", error);
        throw error;
    }
}

/**
 * Checks if a file exists, and if not, creates it and appends headers to it.
 *
 * @param {string} filePath - The path to the file.
 * @param {string[]} headers - The headers to append to the file.
 */
export async function check_and_create_file_with_headers(filePath: string, headers: string[]) {
    try {
        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            // If the file does not exist, create it by writing an empty string
            await fs.promises.writeFile(filePath, "", { encoding: "utf8" });
            console.log(`File created: ${filePath}`);
            // Append headers to the newly created or existing file
            await append_to_csv(headers, filePath);
            console.log(`Headers appended to file: ${filePath}`);
        }
    } catch (error) {
        console.error("Error in checking and creating file with headers:", error);
        throw error;
    }
}

/**
 * Checks if a file exists, and if it does, removes it.
 *
 * @param {string} filePath - The path to the file to check and remove.
 */
export async function check_and_remove_file(filePath: string) {
    try {
        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // If the file exists, remove it
            await fs.promises.unlink(filePath);
            console.log(`File removed: ${filePath}`);
        }
    } catch (error) {
        console.error("Error in checking and removing file:", error);
        throw error;
    }
}
