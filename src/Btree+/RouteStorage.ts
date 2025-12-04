import { RouteInterface } from "../interfaces/Routes.interface";
import { TransportTypes } from "../interfaces/types.enum";

export class RouteStorage {
    // Indexación de rutas: ID de Ruta (string) -> Datos de la Ruta
    routes = new Map<string, RouteInterface>();

    addRoute(route: RouteInterface) {
        if (this.routes.has(route.routeId)) {
            // Esto solo es una advertencia, la sobreescritura puede ser intencional.
            console.warn(`Ruta duplicada detectada: ${route.routeId}`);
        }
        this.routes.set(route.routeId, route);
    }

    getRoute(routeId: string): RouteInterface | undefined {
        return this.routes.get(routeId);
    }


    // BÚSQUEDA POR ESTACIÓN
    getRutesForStation(stationId: number): RouteInterface[] {
        const matchingRoutes: RouteInterface[] = [];
        
        for (const route of this.routes.values()) {
            // Busca si existe alguna parada en esta ruta que coincida con el ID de estación
            const isStop = route.stops.some(stop => stop.stationId === stationId);
            if (isStop) {
                matchingRoutes.push(route);
            }
        }
        return matchingRoutes;
    }
    

  
    getRoutesByType(type: TransportTypes): RouteInterface[] {
        return Array.from(this.routes.values()).filter(r => r.type === type);
    }

 
    getRoutesByCapacityRange(minCapacity: number = 0, maxCapacity: number = Infinity): RouteInterface[] {
        return Array.from(this.routes.values()).filter(r => 
            r.capacity >= minCapacity && r.capacity <= maxCapacity
        );
    }
    

    getRoutesByFrequencyRange(minFrequency: number = 0, maxFrequency: number = Infinity): RouteInterface[] {
        return Array.from(this.routes.values()).filter(r => 
            r.frequencyMinutes >= minFrequency && r.frequencyMinutes <= maxFrequency
        );
    }
  
    getFastestRoute(type?: TransportTypes): RouteInterface | undefined {
        let routes = Array.from(this.routes.values());
        if (type) {
            routes = routes.filter(r => r.type === type);
        }
        // Ordena por frecuencia (ascendente)
        routes.sort((a, b) => a.frequencyMinutes - b.frequencyMinutes);
        return routes.length > 0 ? routes[0] : undefined;
    }
}