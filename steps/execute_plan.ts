import { google_search } from "./step_serpapi";

interface PlanNode {
    id: number;
    type: string;
    input: string;
    dependencies: number[];
}

async function execute_plan(nodes: PlanNode[]): void {
    // Function to perform a topological sort on the nodes
    function topological_sort(nodes: PlanNode[]): PlanNode[] {
        const sorted_nodes: PlanNode[] = [];
        const visited: Set<number> = new Set();
        const temp_mark: Set<number> = new Set();

        function visit(node: PlanNode) {
            if (temp_mark.has(node.id)) {
                throw new Error("Graph is not a DAG");
            }
            if (!visited.has(node.id)) {
                temp_mark.add(node.id);
                node.dependencies.forEach((dep_id) => {
                    const dep_node = nodes.find((n) => n.id === dep_id);
                    if (dep_node) {
                        visit(dep_node);
                    }
                });
                temp_mark.delete(node.id);
                visited.add(node.id);
                sorted_nodes.push(node);
            }
        }

        nodes.forEach((node) => {
            if (!visited.has(node.id)) {
                visit(node);
            }
        });

        return sorted_nodes;
    }

    // Adapter function for known pairings
    async function adapter(node1: PlanNode, node2: PlanNode): void {
        if (node1.type === "google_search" && node2.type === "get_websites_content") {
            const search_results = await google_search(node1.input);
            console.log(`Executing step: ${node2.type} with adapted input: ${search_results}`);
            return search_results;
        } else {
            console.log(`Executing step: ${node1.type} with input: ${node1.input}`);
            console.log(`Executing step: ${node2.type} with input: ${node2.input}`);
        }
    }

    // Sort the nodes based on dependencies
    const sorted_nodes = topological_sort(nodes);

    // Execute the nodes in the sorted order with adapter check
    for (let i = 0; i < sorted_nodes.length; i++) {
        const current_node = sorted_nodes[i];
        const next_node = sorted_nodes[i + 1];

        if (next_node && current_node.type === "google_search" && next_node.type === "get_websites_content") {
            await adapter(current_node, next_node);
            i++; // Skip the next node as it has been processed
        } else {
            console.log(`Executing step: ${current_node.type} with input: ${current_node.input}`);
        }
    }
}

// Example usage
const nodes: PlanNode[] = [
    {
        id: 1,
        type: "google_search",
        input: "Best coffee shops in Denver.",
        dependencies: [],
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
        dependencies: [2],
    },
];

execute_plan(nodes);
