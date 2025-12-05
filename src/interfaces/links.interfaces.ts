export interface EdgeDataInterface {
    weight: number;   // Costo/Distancia (para algoritmos de ruta corta como Dijkstra)
    flow: number;     // Flujo actual (Inicialmente 0, usado por Edmonds-Karp)
    capacity: number; // Capacidad máxima (El valor aleatorio)
}