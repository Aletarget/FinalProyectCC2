import { StationInterface } from "../interfaces/Stations.interface";
import { TransportTypes } from "../interfaces/types.enum";

// Función auxiliar de distancia (al cuadrado, es más rápido que usar Math.sqrt)
function getSqDistance(st1: StationInterface, st2: StationInterface): number {
    const dx = st1.coords[0] - st2.coords[0];
    const dy = st1.coords[1] - st2.coords[1];
    return dx * dx + dy * dy;
}

export class Graph {
    stations = new Map<number, StationInterface>();
    adjList = new Map<number, Set<number>>();

    // ... (Métodos addStation y connect son iguales) ...

    addStation(st: StationInterface) {
        this.stations.set(st.id, st);
        if (!this.adjList.has(st.id)) {
            this.adjList.set(st.id, new Set());
        }
    }

    connect(a: number, b: number) {
        if (!this.adjList.has(a) || !this.adjList.has(b)) return;
        this.adjList.get(a)!.add(b);
        this.adjList.get(b)!.add(a);
    }

    // ... (Métodos connectByName y connectInternalTransfer son iguales) ...

    /**
     * Conecta dos estaciones buscando por nombre aproximado.
     * Si hay varias estaciones con nombres similares (ej: Ricaurte F y Ricaurte E),
     * conecta el par más cercano físicamente entre los resultados de búsqueda.
     */
    connectByName(nameA: string, nameB: string) {
        const candidatesA: StationInterface[] = [];
        const candidatesB: StationInterface[] = [];

        // 1. Buscar candidatos
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

        // 2. Encontrar el par más cercano
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

        // 3. Realizar conexión
        if (bestPair) {
            this.connect(bestPair[0], bestPair[1]);
        }
    }

    /**
     * Conecta internamente todas las estaciones que comparten exactamente el mismo nombre o fragmento
     * Útil para: Ricaurte con Ricaurte, Av Jiménez con Av Jiménez.
     */
    connectInternalTransfer(nameQuery: string) {
        const candidates: StationInterface[] = [];
        const search = nameQuery.toLowerCase().trim();

        for (const st of this.stations.values()) {
            if (st.name.toLowerCase().includes(search)) candidates.push(st);
        }

        if (candidates.length < 2) return;

        // Conectar todos contra todos (Malla completa para el transbordo)
        for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
                this.connect(candidates[i].id, candidates[j].id);
                // console.log(`Transbordo Interno: ${candidates[i].name} <-> ${candidates[j].name}`);
            }
        }
    }

    // 1. Conexión de estaciones DENTRO de la misma troncal o línea (TM y Metro)
    autoConnect() {
        // Agrupa por Troncal (TM) o Línea (Metro)
        const groups = new Map<string, StationInterface[]>();

        for (const st of this.stations.values()) {
            let key = st.troncal || st.lineName; // Usar 'troncal' (TM) o 'lineName' (Metro)

            // Solo conectar si tiene una línea definida y no es SITP (que se maneja aparte)
            if (!key || st.type === TransportTypes.sitp) continue;
            
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(st);
        }

        for (const group of groups.values()) {
            if (group.length <= 1) continue;

            // 💡 Lógica de orientación (X vs Y) para ordenar y conectar linealmente
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
                    comparison = a.coords[0] - b.coords[0]; // Ordenar por Longitud (Eje X)
                    // Desempate usando Latitud (Y)
                    if (Math.abs(comparison) < 1e-6) comparison = a.coords[1] - b.coords[1];
                } else {
                    comparison = a.coords[1] - b.coords[1]; // Ordenar por Latitud (Eje Y)
                    // Desempate usando Longitud (X)
                    if (Math.abs(comparison) < 1e-6) comparison = a.coords[0] - b.coords[0];
                }
                return comparison;
            });

            // Conectar la estación con su siguiente vecina en la lista ordenada
            for (let i = 0; i < group.length - 1; i++) {
                this.connect(group[i].id, group[i + 1].id);
            }
        }
    }

    // 2. Heurística para conexión de paraderos SITP
    autoConnectSITP(maxDistanceMeters: number = 7500) {
        const maxConetionsSitp = 3;
        // Convertir la distancia máxima de metros a unidades de coordenadas (grados decimales)
        // Aproximadamente 1 grado de latitud/longitud es 111,320 metros.
        // Usaremos una aproximación simple para Bogotá (ignora la diferencia entre lat/lon a esta escala).
        // 100 metros / 111320 m/grado ≈ 0.0009 grados.        
        const sitpStations: StationInterface[] = [];
        for (const st of this.stations.values()) {
            if (st.type === TransportTypes.sitp) {
                sitpStations.push(st);
            }
        }

        // Iterar sobre todos los paraderos SITP y buscar vecinos dentro del radio
        for (let i = 0; i < sitpStations.length; i++) {
            const stA = sitpStations[i];
            
            // Solo busca en las estaciones siguientes para evitar doble conexión
            for (let j = i + 1; j < sitpStations.length; j++) {
                const stB = sitpStations[j];

                // Heurística de Radio (Vecindad)
                const sqDist = getSqDistance(stA, stB);
                const conectionsSTA = this.adjList.get(stA.id)?.size ?? 0;
                const conectionsSTB = this.adjList.get(stB.id)?.size ?? 0;
                if(conectionsSTA <= maxConetionsSitp && conectionsSTB <= maxConetionsSitp){

                    if (sqDist <= maxDistanceMeters) {
                        // Conexión si están dentro del radio
                        this.connect(stA.id, stB.id);
                    }
                }
            }
        }
        console.log(`Heurística SITP aplicada: Conectados paraderos a menos de ${maxDistanceMeters} metros.`);
    }
}