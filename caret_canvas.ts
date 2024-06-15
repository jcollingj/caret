import CaretPlugin from "main";
import { View } from "obsidian";

import { CaretPluginSettings, Edge, Node, SparkleConfig } from "./types";

export class CaretCanvas {
  nodes: Node[];
  edges: Edge[];
  canvas: any;
  constructor(readonly canvas_view: View) {
    // @ts-ignore
    if (!canvas_view || !canvas_view.canvas) {
      return;
    }
    // @ts-ignore
    const canvas = canvas_view.canvas;
    this.canvas = canvas;

    // node.unknownData.role = "user";

    const canvas_data = canvas.getData();
    const { edges, nodes } = canvas_data;
    this.nodes = nodes;
    this.edges = edges;
  }

  textById() {
    const res: { [k: string]: string } = {};
    this.nodes.forEach((node) => {
      res[node.id] = node.text;
    });
    return res;
  }

  getNode(nodeId: string) {
    const [res] = this.nodes.filter((node) => node.id === nodeId);
    return new CaretNode(res, this);
  }

  getLongestLineage(node_id: string) {
    return CaretPlugin.getLongestLineage(this.nodes, this.edges, node_id);
  }

  static fromPlugin(plugin: CaretPlugin) {
    return new CaretCanvas(plugin.app.workspace.getMostRecentLeaf()!.view);
  }
}

export function mergeSettingsAndSparkleConfig(settings: CaretPluginSettings, sparkle_config: SparkleConfig): SparkleConfig {
  let model = settings.model;
  let provider = settings.llm_provider;
  let temperature = settings.temperature;
  if (sparkle_config.model !== "default") {
    model = sparkle_config.model;
  }
  if (sparkle_config.provider !== "default") {
    provider = sparkle_config.provider;
  }
  if (sparkle_config.temperature !== settings.temperature) {
    temperature = sparkle_config.temperature;
  }
  return { model, provider, temperature };
}

export class CaretNode {
  constructor(readonly node: Node, readonly canvas_nodes: CaretCanvas) {}

  outgoingNodes() {
    return this.canvas_nodes.edges
      .filter((edge) => edge.fromNode === this.node.id)
      .map((edge) => this.canvas_nodes.getNode(edge.toNode));
  }

  get id() {
    return this.node.id;
  }

  getLongestLineage() {
    return this.canvas_nodes.getLongestLineage(this.node.id);
  }
}
