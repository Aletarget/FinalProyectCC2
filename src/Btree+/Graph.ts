// structures/Graph.ts

import { StationTMInterface } from "../interfaces/StationTM.interface";

export class Graph {
  stations = new Map<number, StationTMInterface>();
  adjList = new Map<number, Set<number>>();

  addStation(st: StationTMInterface) {
    this.stations.set(st.id, st);
    this.adjList.set(st.id, new Set());
  }

  connect(a: number, b: number) {
    this.adjList.get(a)?.add(b);
    this.adjList.get(b)?.add(a);
  }

  autoConnect() {
      const groups = new Map<string, StationTMInterface[]>();

      for (const st of this.stations.values()) {
          if (!st.troncal) continue;
          if (!groups.has(st.troncal)) groups.set(st.troncal, []);
          groups.get(st.troncal)!.push(st);
      }

      for (const group of groups.values()) {
          if (group.length <= 1) continue;

          // 1. Determinar la orientación dominante de la troncal
          // Calculamos el rango total de X (Longitud) y Y (Latitud) en píxeles.
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
          
          // 2. Definir los criterios de ordenación
          // Si el rango X es significativamente mayor que el rango Y (p. ej., 1.5x), es horizontal (Eje X dominante).
          const isHorizontal = rangeX > rangeY * 1.5; 

          // 3. Aplicar ordenamiento basado en la orientación
          group.sort((a, b) => {
              let comparison = 0;

              if (isHorizontal) {
                  // Troncales horizontales (Ej: F, K en parte): Ordenar primariamente por X
                  comparison = a.coords[0] - b.coords[0]; 
                  // Desempate: Si X es igual, ordenar por Y (para secciones curvas)
                  if (comparison === 0) {
                      comparison = a.coords[1] - b.coords[1];
                  }
              } else {
                  // Troncales verticales (Ej: A, B, C, G, H): Ordenar primariamente por Y
                  comparison = a.coords[1] - b.coords[1]; 
                  // Desempate: Si Y es igual, ordenar por X (para estaciones dobles o curvas)
                  if (comparison === 0) {
                      comparison = a.coords[0] - b.coords[0];
                  }
              }
              return comparison;
          });

          // 4. Conectar las estaciones en el orden determinado
          for (let i = 0; i < group.length - 1; i++) {
              this.connect(group[i].id, group[i + 1].id);
          }
      }
  }
}
