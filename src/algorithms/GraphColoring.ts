import { Graph } from "../Btree+/Graph";

export class GraphColoring {

    private adjList: Map<number, Map<number, any>>;
    private stationIDs: number[];

    constructor(graph: Graph) {
        // Usar adjListComplete para conflictos reales
        this.adjList = graph.adjListComplete;

        // Ordenar estaciones por grado (Welsh–Powell)
        this.stationIDs = Array.from(graph.stations.keys()).sort((a, b) => {
            const degA = this.adjList.get(a)?.size ?? 0;
            const degB = this.adjList.get(b)?.size ?? 0;
            return degB - degA; // mayor grado primero
        });
    }

    greedyColoring(): Map<number, number> {

        const resultColors = new Map<number, number>();

        for (const u of this.stationIDs) {

            // colores que NO se pueden usar
            const forbiddenColors = new Set<number>();

            const neighbors = this.adjList.get(u);
            if (neighbors) {
                for (const v of neighbors.keys()) {
                    if (resultColors.has(v)) {
                        forbiddenColors.add(resultColors.get(v)!);
                    }
                }
            }

            // buscar color disponible
            let color = 1;
            while (forbiddenColors.has(color)) {
                color++;
            }

            resultColors.set(u, color);
        }

        const maxColor = Math.max(...resultColors.values());
        console.log(`✔ Coloreado greedy completo usando ${maxColor} colores.`);

        return resultColors;
    }
}
