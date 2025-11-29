import { StationInterface } from "../interfaces/Stations.interface";

// Función auxiliar de distancia
function getSqDistance(st1: StationInterface, st2: StationInterface): number {
    const dx = st1.coords[0] - st2.coords[0];
    const dy = st1.coords[1] - st2.coords[1];
    return dx * dx + dy * dy;
}

export class Graph {
    stations = new Map<number, StationInterface>();
    adjList = new Map<number, Set<number>>();

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

    // --- MÉTODOS PARA CONEXIÓN MANUAL ---

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
            // Usamos includes para permitir búsquedas parciales (ej: "Jiménez" encuentra "Avenida Jiménez")
            if (stName.includes(searchA)) candidatesA.push(st);
            if (stName.includes(searchB)) candidatesB.push(st);
        }

        if (candidatesA.length === 0 || candidatesB.length === 0) {
            console.warn(`⚠️ No se pudo conectar manual: "${nameA}" con "${nameB}". Alguna no existe.`);
            return;
        }

        // 2. Encontrar el par más cercano (para evitar conectar la Ricaurte incorrecta si está lejos)
        let bestPair: [number, number] | null = null;
        let minSqDist = Infinity;

        for (const stA of candidatesA) {
            for (const stB of candidatesB) {
                if (stA.id === stB.id) continue; // No conectar consigo misma

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
            // Opcional: Console log para verificar
            // console.log(`🔗 Manual: ${this.stations.get(bestPair[0])?.name} <-> ${this.stations.get(bestPair[1])?.name}`);
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
                console.log(`🔄 Transbordo Interno: ${candidates[i].name} (${candidates[i].troncal}) <-> ${candidates[j].name} (${candidates[j].troncal})`);
            }
        }
    }

    // 1. Conexión de estaciones DENTRO de la misma troncal
    autoConnect() {
        const groups = new Map<string, StationInterface[]>();

        for (const st of this.stations.values()) {
            if (!st.troncal) continue;
            if (!groups.has(st.troncal)) groups.set(st.troncal, []);
            groups.get(st.troncal)!.push(st);
        }

        for (const group of groups.values()) {
            if (group.length <= 1) continue;

            // Lógica de orientación (X vs Y)
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
            // Si es mucho más ancha que alta, es Horizontal.
            const isHorizontal = rangeX > rangeY * 1.2; 

            group.sort((a, b) => {
                let comparison = 0;
                if (isHorizontal) {
                    comparison = a.coords[0] - b.coords[0]; 
                    if (Math.abs(comparison) < 1) comparison = a.coords[1] - b.coords[1];
                } else {
                    comparison = a.coords[1] - b.coords[1]; 
                    if (Math.abs(comparison) < 1) comparison = a.coords[0] - b.coords[0];
                }
                return comparison;
            });

            for (let i = 0; i < group.length - 1; i++) {
                this.connect(group[i].id, group[i + 1].id);
            }
        }
    }

}