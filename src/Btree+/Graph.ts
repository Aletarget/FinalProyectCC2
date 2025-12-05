import { RouteInterface } from "../interfaces/Routes.interface";
import { StationInterface } from "../interfaces/Stations.interface";
import { TransportTypes } from "../interfaces/types.enum";

// Función auxiliar de distancia (al cuadrado)
function getSqDistance(st1: StationInterface, st2: StationInterface): number {
    const dx = st1.coords[0] - st2.coords[0];
    const dy = st1.coords[1] - st2.coords[1];
    return dx * dx + dy * dy;
}

export class Graph {
    stations = new Map<number, StationInterface>();
    adjList = new Map<number, Map<number, number>>(); // ESTRUCTURA CON PESOS
    // --- MÉTODOS BASE ---

    addStation(st: StationInterface) {
        this.stations.set(st.id, st);
        if (!this.adjList.has(st.id)) {
            this.adjList.set(st.id, new Map());
        }
    }

    connect(a: number, b: number, weight: number = 1) {
        if (a === b) return;

        // normal adjacency list (NO CAMBIA)
        if (!this.adjList.has(a)) this.adjList.set(a, new Map());
        if (!this.adjList.has(b)) this.adjList.set(b, new Map());
        this.adjList.get(a)!.set(b, weight);
        this.adjList.get(b)!.set(a, weight);
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
            this.connect(bestPair[0], bestPair[1], 1); 
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
                // Las conexiones de ruta usan peso 1 (temporal)
                this.connect(group[i].id, group[i + 1].id, 1); 
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
            const stA = sitpStations[i];
            
            for (let j = i + 1; j < sitpStations.length; j++) {
                const stB = sitpStations[j];

                const neighborsOfA = this.adjList.get(stA.id);
                const neighborsOfB = this.adjList.get(stB.id);

                const conectionsSTA = neighborsOfA ? neighborsOfA.size : 0;
                const conectionsSTB = neighborsOfB ? neighborsOfB.size : 0;
                
                if(conectionsSTA <= maxConetionsSitp && conectionsSTB <= maxConetionsSitp){
                    // Esta lógica de distancia usa las coordenadas del canvas (píxeles), no metros.
                    // Asumimos que la constante 'maxDistanceMeters' ha sido escalada correctamente en BuildStructures.
                    const sqDist = getSqDistance(stA, stB); 

                    if (sqDist <= maxDistanceMeters) {
                        // Conexiones SITP usan peso 1 (temporal)
                        this.connect(stA.id, stB.id, 1); 
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
}