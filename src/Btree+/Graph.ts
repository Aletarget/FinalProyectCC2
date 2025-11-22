// structures/Graph.ts

import { StationTMInterface } from "../interfaces/StationTM.interface";

export class Graph {
  stations = new Map<number, StationTMInterface>();
  adjList = new Map<number, Set<number>>();

  addStation(st: StationTMInterface) {
    this.stations.set(st.id, st);
    this.adjList.set(st.id, new Set());
  }

  connect(a: number, b: number) {
    this.adjList.get(a)?.add(b);
    this.adjList.get(b)?.add(a);
  }

  // generar conexiones automáticas por troncales
  autoConnect() {
    const groups = new Map<string, StationTMInterface[]>();

    for (const st of this.stations.values()) {
      if (!st.troncal) continue;

      if (!groups.has(st.troncal)) groups.set(st.troncal, []);
      groups.get(st.troncal)!.push(st);
    }

    for (const group of groups.values()) {
      group.sort((a, b) => a.coords[1] - b.coords[1]); // ordenar por eje Y

      for (let i = 0; i < group.length - 1; i++) {
        this.connect(group[i].id, group[i + 1].id);
      }
    }
  }
}
