// /src/algorithms/dijkstra.ts

import { Graph } from "../Btree+/Graph";
import { StationInterface } from "../interfaces/Stations.interface";

// 1. Priority Queue (Min-Heap basado en array)
class PriorityQueue {
    private nodes: { id: number, time: number }[] = [];

    enqueue(id: number, time: number): void {
        this.nodes.push({ id, time });
        this.bubbleUp();
    }

    dequeue(): { id: number, time: number } | undefined {
        const min = this.nodes[0];
        const end = this.nodes.pop();
        if (this.nodes.length > 0 && end) {
            this.nodes[0] = end;
            this.sinkDown();
        }
        return min;
    }

    private bubbleUp(): void {
        let idx = this.nodes.length - 1;
        const element = this.nodes[idx];
        while (idx > 0) {
            let parentIdx = Math.floor((idx - 1) / 2);
            let parent = this.nodes[parentIdx];
            if (element.time >= parent.time) break;
            this.nodes[parentIdx] = element;
            this.nodes[idx] = parent;
            idx = parentIdx;
        }
    }

    private sinkDown(): void {
        let idx = 0;
        const length = this.nodes.length;
        const element = this.nodes[0];
        while (true) {
            let leftChildIdx = 2 * idx + 1;
            let rightChildIdx = 2 * idx + 2;
            let swap: number | null = null;

            if (leftChildIdx < length) {
                let leftChild = this.nodes[leftChildIdx];
                if (leftChild.time < element.time) {
                    swap = leftChildIdx;
                }
            }
            if (rightChildIdx < length) {
                let rightChild = this.nodes[rightChildIdx];
                const leftTime = swap !== null ? this.nodes[leftChildIdx].time : Infinity;
                
                if (
                    (swap === null && rightChild.time < element.time) ||
                    (swap !== null && rightChild.time < leftTime)
                ) {
                    swap = rightChildIdx;
                }
            }
            if (swap === null) break;
            this.nodes[idx] = this.nodes[swap];
            this.nodes[swap] = element;
            idx = swap;
        }
    }

    get isEmpty(): boolean {
        return this.nodes.length === 0;
    }
}


// 2. Clase Dijkstra
export class Dijkstra {
    private graph: Graph;

    constructor(graph: Graph) {
        this.graph = graph;
    }

    findShortestPath(startId: number, endId: number): { path: StationInterface[], totalTime: number } | null {
        
        const distances = new Map<number, number>();
        const previous = new Map<number, number | null>();
        const pq = new PriorityQueue();
        
        // 1. Inicialización
        for (const id of this.graph.stations.keys()) {
            distances.set(id, Infinity);
            previous.set(id, null);
        }

        distances.set(startId, 0);
        pq.enqueue(startId, 0);

        // 2. Proceso de Dijkstra
        while (!pq.isEmpty) {
            const minNode = pq.dequeue();
            if (!minNode) continue;

            const currentId = minNode.id;
            const currentDist = minNode.time;

            // Ignorar entradas obsoletas
            if (currentDist > distances.get(currentId)!) {
                continue;
            }

            // Llegamos al destino
            if (currentId === endId) break;

            const neighbors = this.graph.adjList.get(currentId);
            if (!neighbors) continue;

            neighbors.forEach((weight, neighborId) => {
                const newDist = currentDist + weight;

                if (newDist < distances.get(neighborId)!) {
                    distances.set(neighborId, newDist);
                    previous.set(neighborId, currentId);
                    pq.enqueue(neighborId, newDist);
                }
            });
        }

        // 3. Reconstrucción del camino
        const pathIds: number[] = [];
        let step: number | null = endId;
        
        if (distances.get(endId) === Infinity) {
            return null; // No hay camino
        }

        while (step !== null) {
            pathIds.unshift(step);
            step = previous.get(step) || null;
        }
        
        const path: StationInterface[] = pathIds.map(id => this.graph.stations.get(id)!);

        return { 
            path, 
            totalTime: distances.get(endId)! 
        };
    }
}