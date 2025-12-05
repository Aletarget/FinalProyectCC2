// Importa la enumeración de tipos de transporte si está en otro archivo
import { TransportTypes } from "./types.enum"; 

export interface RouteStopInterface {
    stationId: number; // La clave de la estación en el B+ Tree de estaciones
    sequence: number;  // Orden de parada dentro de la ruta (1, 2, 3...)
    stopTimeMinutes: number; // Tiempo de parada estimado en minutos
}
export interface Route {
    route_id: string;
    stops: number[]; // Array de IDs de estaciones
}

export interface RouteInterface {
    routeId: string; // Clave de la ruta (ej: "A60", "L1-S", "C11")
    type: TransportTypes;
    name: string;      // Nombre completo (ej: "Portal del Sur - Suba")
    capacity: number;  // Capacidad máxima de pasajeros (ej: 160 para un articulado)
    frequencyMinutes: number; // Frecuencia de salida en minutos (ej: 5 min)
    
    // Lista ordenada de paradas/estaciones que componen esta ruta.
    stops: RouteStopInterface[]; 
}