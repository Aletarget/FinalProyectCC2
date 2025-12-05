// algorithms/minimumSpanningTree.ts

import { Graph } from "../Btree+/Graph";


interface MSTEdge {
    u: number;
    v: number;
    weight: number;
}

class DSU {
    parent: Map<number, number> = new Map();

    find(x: number): number {
        if (this.parent.get(x) === x) return x;
        const root = this.find(this.parent.get(x)!);
        this.parent.set(x, root);
        return root;
    }

    union(a: number, b: number): boolean {
        const rootA = this.find(a);
        const rootB = this.find(b);
        if (rootA === rootB) return false;
        this.parent.set(rootA, rootB);
        return true;
    }
}

export function buildMinimumSpanningTree(graph: Graph): MSTEdge[] {
    const edges: MSTEdge[] = [];

    // Extraemos TODAS las aristas (usando adjListComplete)
    for (const [u, neighbors] of graph.adjListComplete.entries()) {
        for (const [v, data] of neighbors.entries()) {
            edges.push({ u, v, weight: data.weight });
        }
    }

    // Ordenar por menor peso (tiempo/distancia)
    edges.sort((a, b) => a.weight - b.weight);

    const dsu = new DSU();

    // Inicializamos el DSU
    for (const node of graph.stations.keys()) {
        dsu.parent.set(node, node);
    }

    const mst: MSTEdge[] = [];

    for (const e of edges) {
        if (dsu.union(e.u, e.v)) {
            mst.push(e);
        }
    }

    return mst;
}
