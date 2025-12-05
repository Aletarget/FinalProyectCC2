// structures/Btree+/CalculateAdjListWithWeights.ts
import { StationInterface } from "../../interfaces/Stations.interface";
import { TransportTypes } from "../../interfaces/types.enum";
import { constsWeights } from "../../interfaces/weights.enum";
import { Graph } from "../Graph";

// Función auxiliar: Calcula la distancia euclidiana entre dos puntos (en unidades de píxeles)
function getDistance(st1: StationInterface, st2: StationInterface): number {
    const dx = st1.coords[0] - st2.coords[0];
    const dy = st1.coords[1] - st2.coords[1];
    return Math.sqrt(dx * dx + dy * dy);
}

export class CalculateAdjListWithWeights {
    
    // Convertimos la constante global en una propiedad estática privada.
    private static PIXEL_TO_METER_RATIO: number = 0.5; 

    // Velocidades en [Metros / Minuto]
    private static readonly TM_SPEED_METERS_PER_MIN = 350;
    private static readonly METRO_SPEED_METERS_PER_MIN = 600;
    private static readonly SITP_SPEED_METERS_PER_MIN = 150;
    
    private estimateWeight(stA: StationInterface, stB: StationInterface, isInternalTransfer: boolean): number {
        
        const distPixels = getDistance(stA, stB); 
        
        //Transbordo (Caminata o Penalización Fija)
        if (isInternalTransfer || stA.type !== stB.type) {
            
            // Usamos la propiedad estática
            const distMeters = distPixels * CalculateAdjListWithWeights.PIXEL_TO_METER_RATIO;
            
            if (distMeters === 0) {
                 return constsWeights.METRO_TRAVEL_TIME;
            }

            const walkingTime = distMeters / constsWeights.WALKING_SPEED_METERS_PER_MINUTE;
            
            let penalty = 0;
            if (stA.type !== stB.type) {
                penalty = constsWeights.TM_TRAVEL_TIME; 
            } else if (isInternalTransfer) {
                penalty = constsWeights.METRO_TRAVEL_TIME; 
            }

            return walkingTime + penalty;
        } 
        
        //Viaje de Ruta (Mismo Sistema y Adyacencia Automática)
        else {
            let speedMetersPerMin: number;
            
            if (stA.type === TransportTypes.transM) {
                speedMetersPerMin = CalculateAdjListWithWeights.TM_SPEED_METERS_PER_MIN;
            } else if (stA.type === TransportTypes.metro) {
                speedMetersPerMin = CalculateAdjListWithWeights.METRO_SPEED_METERS_PER_MIN;
            } else if (stA.type === TransportTypes.sitp) {
                speedMetersPerMin = CalculateAdjListWithWeights.SITP_SPEED_METERS_PER_MIN;
            } else {
                speedMetersPerMin = constsWeights.WALKING_SPEED_METERS_PER_MINUTE;
            }

            // Usamos la propiedad estática
            const distMeters = distPixels * CalculateAdjListWithWeights.PIXEL_TO_METER_RATIO;

            const travelTime = distMeters / speedMetersPerMin;
            const smallStopPenalty = 0.5; 

            return travelTime + smallStopPenalty;
        }
    }

    public applyWeightsToGraph(graph: Graph, pixelToMeterRatio: number): void {
        //Asignar el valor inyectado a la propiedad estática de la clase
        CalculateAdjListWithWeights.PIXEL_TO_METER_RATIO = pixelToMeterRatio; 
        
        const tempAdjList = new Map<number, Map<number, number>>();
        
        for (const [idA, neighbors] of graph.adjList.entries()) {
            const stA = graph.stations.get(idA);
            if (!stA) continue;
            
            tempAdjList.set(idA, new Map());
            
            //Cambiar [idB] por idB para iterar correctamente sobre Map.keys()
            for (const idB of neighbors.keys()) {
                const stB = graph.stations.get(idB);
                if (!stB) continue;
                
                // Determinar si es una conexión de Transbordo Manual (heurística de nombre)
                const nameA = stA.name.split(' ')[0].toLowerCase();
                const nameB = stB.name.split(' ')[0].toLowerCase();
                const isInternalTransfer = (nameA === nameB && stA.id !== stB.id);

                const weight = this.estimateWeight(stA, stB, isInternalTransfer);
                
                tempAdjList.get(idA)!.set(idB, weight);
            }
        }
        
        graph.adjList = tempAdjList;
        console.log("Pesos (tiempo en minutos) aplicados a todas las aristas del grafo.");
    }
}