// structures/buildFromData.ts
import { StationTMInterface } from "../interfaces/StationTM.interface";
import { BPlusTree } from "./Bplustree";
import { Graph } from "./Graph";
import { flattenData } from "./TransformData/CreateJson";

export function buildTMStructures(order = 4) {
  const data: StationTMInterface[] = flattenData.rawToJsonTM();

  const tree = new BPlusTree<StationTMInterface>(order);
  const graph = new Graph();

  data.forEach(st => {
    tree.insert(st.id, st);
    graph.addStation(st);
  });

  graph.autoConnect();

  return { tree, graph };
}
