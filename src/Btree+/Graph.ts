import { EdmondsKarp } from "../algorithms/maxFlow";
import { EdgeDataInterface } from "../interfaces/links.interfaces";
import { RouteInterface } from "../interfaces/Routes.interface";
import { StationInterface } from "../interfaces/Stations.interface";
import { TransportTypes } from "../interfaces/types.enum";
import { flattenData } from "./TransformData/CreateJson";

// Función auxiliar de distancia (al cuadrado)
function getSqDistance(st1: StationInterface, st2: StationInterface): number {
    const dx = st1.coords[0] - st2.coords[0];
    const dy = st1.coords[1] - st2.coords[1];
    return dx * dx + dy * dy;
}

export class Graph {
    stations = new Map<number, StationInterface>();
    adjList = new Map<number, Map<number, number>>(); // ESTRUCTURA CON PESOS
    adjListComplete = new Map<number, Map<number, EdgeDataInterface>> 

    mstEdges: Array<[number, number, number]> = [];
    // --- MÉTODOS BASE ---

    addStation(st: StationInterface) {
        this.stations.set(st.id, st);
        if (!this.adjList.has(st.id)) {
            this.adjList.set(st.id, new Map());
        }
    }

    connect(a: number, b: number, weight: number = 1, transportType?: TransportTypes) {
            if (a === b) return;

            // 1. Obtener el tipo de transporte para la capacidad
            let type: TransportTypes;
            if (transportType) {
                type = transportType;
            } else {
                // Heurística: Si no se especifica, usa el tipo de la estación A.
                const stA = this.stations.get(a);
                type = stA ? stA.type : TransportTypes.sitp; // Default a SITP si no se encuentra
            }
    
            const capacity = flattenData.generateEdgeCapacity(type);
            const edgeData: EdgeDataInterface = { weight, flow: 0, capacity };

            // 2. Poblar la lista de adyacencia completa (DIRECTO)
            // Arista A -> B
            if (!this.adjListComplete.has(a)) this.adjListComplete.set(a, new Map());
            this.adjListComplete.get(a)!.set(b, {...edgeData}); // Usar copia
            
            // 3. Poblar la lista de adyacencia completa (INVERSO)
            // Edmonds-Karp necesita el arco de retorno con capacidad 0 y flow 0.
            // OJO: Si es una conexión SIMÉTRICA (dos vías), la capacidad es la misma.
            const edgeDataReverse: EdgeDataInterface = { weight, flow: 0, capacity };
            if (!this.adjListComplete.has(b)) this.adjListComplete.set(b, new Map());
            this.adjListComplete.get(b)!.set(a, {...edgeDataReverse}); // Usar copia
            
            // OPCIONAL: Si aún usas la lista simple adjList, actualízala aquí:
            if (!this.adjList.has(a)) this.adjList.set(a, new Map());
            if (!this.adjList.has(b)) this.adjList.set(b, new Map());
            this.adjList.get(a)!.set(b, weight);
            this.adjList.get(b)!.set(a, weight); 

            // Console.log para verificación:
            // console.log(`Conexión ${a} -> ${b}. Tipo: ${type}. Capacidad: ${capacity}`);
    }

    // --- MÉTODOS DE CONEXIÓN MANUAL/HEURÍSTICA ---

    /**
     * Conecta dos estaciones buscando por nombre aproximado, usando peso temporal (1).
     */
    connectByName(nameA: string, nameB: string) {
        const candidatesA: StationInterface[] = [];
        const candidatesB: StationInterface[] = [];

        const searchA = nameA.toLowerCase().trim();
        const searchB = nameB.toLowerCase().trim();

        for (const st of this.stations.values()) {
            const stName = st.name.toLowerCase();
            if (stName.includes(searchA)) candidatesA.push(st);
            if (stName.includes(searchB)) candidatesB.push(st);
        }

        if (candidatesA.length === 0 || candidatesB.length === 0) {
            console.warn(`⚠️ No se pudo conectar manual: "${nameA}" con "${nameB}". Alguna no existe.`);
            return;
        }

        let bestPair: [number, number] | null = null;
        let minSqDist = Infinity;

        for (const stA of candidatesA) {
            for (const stB of candidatesB) {
                if (stA.id === stB.id) continue;

                const dist = getSqDistance(stA, stB);
                if (dist < minSqDist) {
                    minSqDist = dist;
                    bestPair = [stA.id, stB.id];
                }
            }
        }

        if (bestPair) {
            // Conexiones manuales/de transbordo usan peso 1 (temporal). 
            // La clase de pesos aplicará el costo real (e.g., constsWeights.INTERNAL_TRANSFER_PENALTY)
            this.connect(bestPair[0], bestPair[1], 1, this.stations.get(bestPair[0])?.type); 
        }
    }

    /**
     * Conecta internamente todas las estaciones que comparten exactamente el mismo nombre.
     * Útil para transbordos (Ricaurte F <-> Ricaurte NQS). Usa peso temporal (1).
     */
    connectInternalTransfer(nameQuery: string) {
        const candidates: StationInterface[] = [];
        const search = nameQuery.toLowerCase().trim();

        for (const st of this.stations.values()) {
            if (st.name.toLowerCase().includes(search)) candidates.push(st);
        }

        if (candidates.length < 2) return;

        // Conectar todos contra todos
        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                // Conexiones internas usan peso 1 (temporal)
                this.connect(candidates[i].id, candidates[j].id, 1); 
            }
        }
    }

    // --- MÉTODOS DE CONEXIÓN AUTOMÁTICA ---

    // 1. Conexión de estaciones DENTRO de la misma troncal o línea (TM y Metro)
    autoConnect() {
        // Agrupa por Troncal (TM) o Línea (Metro)
        const groups = new Map<string, StationInterface[]>();

        for (const st of this.stations.values()) {
            let key = st.troncal || st.lineName;

            if (!key || st.type === TransportTypes.sitp) continue;
            
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(st);
        }

        for (const group of groups.values()) {
            if (group.length <= 1) continue;

            // ... (Lógica de ordenamiento por coordenadas X o Y) ...
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            group.forEach(st => {
                minX = Math.min(minX, st.coords[0]);
                maxX = Math.max(maxX, st.coords[0]);
                minY = Math.min(minY, st.coords[1]);
                maxY = Math.max(maxY, st.coords[1]);
            });
            
            const rangeX = maxX - minX;
            const rangeY = maxY - minY;
            const isHorizontal = rangeX > rangeY * 1.2; 

            group.sort((a, b) => {
                let comparison = 0;
                if (isHorizontal) {
                    comparison = a.coords[0] - b.coords[0];
                    if (Math.abs(comparison) < 1e-6) comparison = a.coords[1] - b.coords[1];
                } else {
                    comparison = a.coords[1] - b.coords[1];
                    if (Math.abs(comparison) < 1e-6) comparison = a.coords[0] - b.coords[0];
                }
                return comparison;
            });
            // Conectar la estación con su siguiente vecina en la lista ordenada
            for (let i = 0; i < group.length - 1; i++) {
                const stA = group[i];
                const stB = group[i + 1];
                
                // Determinamos el tipo de transporte de la ruta (Metro o TransMilenio)
                const type = stA.type === TransportTypes.metro ? TransportTypes.metro : TransportTypes.transM;
                // Las conexiones de ruta usan peso 1 (temporal)
                this.connect(stA.id, stB.id, 1, type); 
            }
        }
    }

    // 2. Heurística para conexión de paraderos SITP
    autoConnectSITP(maxDistanceMeters: number = 7000) {
        const maxConetionsSitp = 2;
        const sitpStations: StationInterface[] = [];

        for (const st of this.stations.values()) {
            if (st.type === TransportTypes.sitp) {
                sitpStations.push(st);
            }
        }

        for (let i = 0; i < sitpStations.length; i++) {
            
            for (let j = i + 1; j < sitpStations.length; j++) {
                const stA = sitpStations[i];
                const stB = sitpStations[j];

                const neighborsOfA = this.adjList.get(stA.id);
                const neighborsOfB = this.adjList.get(stB.id);

                const conectionsSTA = neighborsOfA ? neighborsOfA.size : 0;
                const conectionsSTB = neighborsOfB ? neighborsOfB.size : 0;
                
                if(conectionsSTA <= maxConetionsSitp && conectionsSTB <= maxConetionsSitp){
                    const sqDist = getSqDistance(stA, stB); 
                    if (sqDist <= maxDistanceMeters) {
                        // El tipo de transporte es SITP
                        this.connect(stA.id, stB.id, 1, TransportTypes.sitp); 
                    }
                }
            }
        }
        console.log(`Heurística SITP aplicada: Conectados paraderos a menos de ${maxDistanceMeters} unidades.`);
    }

    // --- MÉTODOS AUXILIARES ---
    
    /**
     * Verifica la validez de una ruta (utilizada para el dibujo/validación).
     * Nota: La verificación ahora usa `adjList.get(A)?.has(B)` para validar la conexión.
     */
    checkRouteValidity(route: RouteInterface): { isValid: boolean, errorDetail?: string } {
        const stops = route.stops;
        if (stops.length < 2) {
            return { isValid: true };
        }

        const firstStation = this.stations.get(stops[0].stationId);
        const isTMOrMetroRoute = 
            firstStation?.type === TransportTypes.transM || 
            firstStation?.type === TransportTypes.metro; 

        for (let i = 0; i < stops.length - 1; i++) {
            const stationAId = stops[i].stationId;
            const stationBId = stops[i + 1].stationId;
            
            const stationA = this.stations.get(stationAId);
            const stationB = this.stations.get(stationBId);

            // CAMBIO: neighborsOfA es un Map<number, number> ahora
            const neighborsOfA = this.adjList.get(stationAId);
            
            const nameA = stationA?.name || `ID ${stationAId}`;
            const nameB = stationB?.name || `ID ${stationBId}`;
            
            // Caso 1: Conexión directa en el grafo (Verificamos la existencia de la clave en el Map de adyacencia)
            if (neighborsOfA && neighborsOfA.has(stationBId)) {
                continue; 
            }

            // Caso 2: Lógica especial para Transmilenio y Metro (Salto de paradas)
            if (isTMOrMetroRoute && stationA && stationB) {
                const isSkipAllowed = 
                    (stationA.type === TransportTypes.transM && stationB.type === TransportTypes.transM) ||
                    (stationA.type === TransportTypes.metro && stationB.type === TransportTypes.metro);
                
                if (isSkipAllowed) {
                    continue; // Salto de ruta TM o Metro permitido
                }
            }

            // Caso 3: Fallo de conexión
            return { 
                isValid: false, 
                errorDetail: `Ruta ${route.routeId} inválida. No hay adyacencia directa entre las paradas: '${nameA}' (ID ${stationAId}) y '${nameB}' (ID ${stationBId}).`
            };
        }
        return { isValid: true };
    }

    findMaxFlowAnalysis(sourceId: number, sinkId: number): { maxFlow: number, bottleneckEdges: [number, number][] } {
        if (!this.stations.has(sourceId) || !this.stations.has(sinkId)) {
            console.error("IDs de origen o destino no válidos.");
            return { maxFlow: 0, bottleneckEdges: [] };
        }
        
        // El peso de adjList debe haber sido asignado previamente como capacidad.
        const result = EdmondsKarp.calculateMaxFlow(this, sourceId, sinkId);

        // Mapear los IDs de las estaciones a nombres legibles para el análisis
        const bottleneckEdgesNamed = result.minCutEdges.map(([u, v]) => {
            const nameU = this.stations.get(u)?.name || `ID ${u}`;
            const nameV = this.stations.get(v)?.name || `ID ${v}`;
            return [`${nameU} -> ${nameV}`, [u, v]] as const;
        });

        // console.log(`--- Análisis de Congestión: Flujo Máximo ---`);
        // console.log(`Origen: ${this.stations.get(sourceId)?.name} | Destino: ${this.stations.get(sinkId)?.name}`);
        // console.log(`Flujo Máximo (Capacidad Máxima): ${result.maxFlow} unidades/hora.`);
        // console.log(`Cuellos de Botella (Corte Mínimo): ${bottleneckEdgesNamed.length} aristas saturadas.`);
        
        if (bottleneckEdgesNamed.length > 0) {
            console.log("Aristas Críticas:");
            bottleneckEdgesNamed.forEach(([name, _ids]) => {
                console.log(`  - ${name}`);
            });
        }
        
        return { 
            maxFlow: result.maxFlow, 
            bottleneckEdges: result.minCutEdges 
        };
    }


    generateMinimumSpanningTree() {
        const edges: { u: number; v: number; weight: number }[] = [];

        for (const [u, neighbors] of this.adjListComplete.entries()) {
            for (const [v, data] of neighbors.entries()) {
                edges.push({ u, v, weight: data.weight });
            }
        }

        edges.sort((a, b) => a.weight - b.weight);

        const parent = new Map<number, number>();
        const find = (x: number): number => {
            if (parent.get(x) === x) return x;
            const root = find(parent.get(x)!);
            parent.set(x, root);
            return root;
        };
        const union = (a: number, b: number): boolean => {
            const ra = find(a);
            const rb = find(b);
            if (ra === rb) return false;
            parent.set(ra, rb);
            return true;
        };

        for (const id of this.stations.keys()) {
            parent.set(id, id);
        }

        const mst: Array<[number, number, number]> = [];

        for (const e of edges) {
            if (union(e.u, e.v)) {
                mst.push([e.u, e.v, e.weight]);
            }
        }

        console.log("Árbol de Recubrimiento Mínimo generado.");
        this.mstEdges = mst;   // Guardamos el MST dentro del grafo
        return mst;
    }

}