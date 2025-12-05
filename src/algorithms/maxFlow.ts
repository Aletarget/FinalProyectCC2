// En un nuevo archivo: algorithms/EdmondsKarp.ts

import { Graph } from "../Btree+/Graph";

// Estructura de un Grafo Residual: Map<U, Map<V, CapacidadResidual>>
type ResidualGraph = Map<number, Map<number, number>>;

export class EdmondsKarp {
    
    // Método para encontrar el camino aumentante usando BFS
    private static bfsForPath(
        residualGraph: ResidualGraph, 
        startNode: number, 
        endNode: number, 
        parent: Map<number, number | null>
    ): number {
        // Inicialización de BFS
        for (const nodeId of residualGraph.keys()) {
            parent.set(nodeId, null);
        }
        const queue: number[] = [startNode];
        parent.set(startNode, startNode); 

        while (queue.length > 0) {
            const u = queue.shift()!;
            const neighbors = residualGraph.get(u);
            if (neighbors) {
                for (const [v, capacity] of neighbors.entries()) {
                    // Si v no ha sido visitado y hay capacidad residual
                    if (parent.get(v) === null && capacity > 0) {
                        parent.set(v, u);
                        
                        if (v === endNode) {
                            // Encontramos el destino. Calculamos pathFlow (cuello de botella)
                            let pathFlow = Infinity;
                            let s = endNode;

                            while (s !== startNode) {
                                const u_ = parent.get(s)!;
                                pathFlow = Math.min(pathFlow, residualGraph.get(u_)!.get(s)!);
                                s = u_;
                            }
                            return pathFlow;
                        }
                        queue.push(v);
                    }
                }
            }
        }
        // No se encontró ningún camino
        return 0;
    }

    // Método principal de Flujo Máximo
    public static calculateMaxFlow(graph: Graph, sourceId: number, sinkId: number): { maxFlow: number, minCutEdges: [number, number][] } {
        
        // 1. Inicializar el Grafo Residual
        const residualGraph: ResidualGraph = new Map();
        for (const [u, neighbors] of graph.adjListComplete.entries()) {
            if (!residualGraph.has(u)) residualGraph.set(u, new Map());
            for (const [v, adjItem] of neighbors.entries()) {
                residualGraph.get(u)!.set(v, adjItem.capacity);
                // Inicializar arista inversa con capacidad 0 si no existe
                if (!residualGraph.has(v)) residualGraph.set(v, new Map());
                if (!residualGraph.get(v)!.has(u)) residualGraph.get(v)!.set(u, 0);
            }
        }

        let maxFlow = 0;
        const parent = new Map<number, number | null>(); 

        // 2. Iteración de Edmonds-Karp
        while (true) {
            const pathFlow = this.bfsForPath(residualGraph, sourceId, sinkId, parent);
            
            if (pathFlow === 0) {
                break; // No hay más caminos aumentantes
            }

            maxFlow += pathFlow;
            let v = sinkId;
            
            // Actualizar el grafo residual (aristas de avance y retroceso)
            while (v !== sourceId) {
                const u = parent.get(v)!;
                
                // Reducir capacidad de avance
                residualGraph.get(u)!.set(v, residualGraph.get(u)!.get(v)! - pathFlow); 
                // Aumentar capacidad de retroceso
                residualGraph.get(v)!.set(u, residualGraph.get(v)!.get(u)! + pathFlow); 
                
                v = u;
            }
        }

        // 3. Encontrar el Corte Mínimo (Cuello de Botella)
        const minCutEdges = this.findMinCutEdges(graph, sourceId, residualGraph);

        return { maxFlow, minCutEdges };
    }

    // Método para encontrar las aristas saturadas (Cuello de botella)
    private static findMinCutEdges(graph: Graph, sourceId: number, residualGraph: ResidualGraph): [number, number][] {
        const reachableS = new Set<number>();
        const queue: number[] = [sourceId];
        reachableS.add(sourceId);

        // BFS en el grafo residual final para encontrar el conjunto S (nodos alcanzables)
        while (queue.length > 0) {
            const u = queue.shift()!;
            const neighbors = residualGraph.get(u);
            if (neighbors) {
                for (const [v, capacity] of neighbors.entries()) {
                    if (capacity > 0 && !reachableS.has(v)) {
                        reachableS.add(v);
                        queue.push(v);
                    }
                }
            }
        }

        const minCutEdges: [number, number][] = [];
        
        // Las aristas del corte son (u, v) donde u está en S y v no está en S, y (u,v) tiene capacidad original.
        for (const u of reachableS) {
            const neighbors = graph.adjList.get(u); // Usamos el grafo original para el corte
            if (neighbors) {
                for (const [v] of neighbors.entries()) {
                    if (!reachableS.has(v)) {
                        // Arista que va del conjunto S (alcanzable) al conjunto T (no alcanzable)
                        minCutEdges.push([u, v]);
                    }
                }
            }
        }
        return minCutEdges;
    }
}