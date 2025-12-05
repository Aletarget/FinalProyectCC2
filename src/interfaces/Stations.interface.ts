import { TransportTypes } from "./types.enum";

export interface StationInterface {
    id: number,
    name: string,
    coords: [number, number],
    type: TransportTypes; // transM, sitp, metro
    
    // Propiedades específicas del sistema
    troncal?: string; // Solo para TransM
    lineName?: string; // Solo para Metro/SITP (ej: "Línea 1 Metro", "Ruta C11")
}

