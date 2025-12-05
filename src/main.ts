// /src/main.ts
import { Dijkstra } from "./algorithms/dijkstra";
import { GraphColoring } from "./algorithms/GraphColoring";
import { BuildStructures } from "./Btree+/buildFromData";
import { RouteInterface } from "./interfaces/Routes.interface";
import { StationInterface } from "./interfaces/Stations.interface";
import { TransportTypes } from "./interfaces/types.enum";

//Referencias al DOM
const canvas = document.getElementById("map") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const tooltip = document.getElementById("tooltip") as HTMLDivElement;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const searchBtn = document.getElementById("search-btn") as HTMLButtonElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;

//Referencias para la paginación
const nextBtn = document.getElementById("next-btn") as HTMLButtonElement; 
const paginationStatus = document.getElementById("pagination-status") as HTMLSpanElement;

// Referencias para DIJKSTRA (2. REFERENCIAS AL DOM)
const startStationInput = document.getElementById("start-station-input") as HTMLInputElement;
const endStationInput = document.getElementById("end-station-input") as HTMLInputElement;
const findRouteBtn = document.getElementById("find-route-btn") as HTMLButtonElement;
const dijkstraStatus = document.getElementById("dijkstra-status") as HTMLSpanElement;

//Referencias para flujos maximos
const flowStartInput = document.getElementById("flow-start-input") as HTMLInputElement;
const flowEndInput = document.getElementById("flow-end-input") as HTMLInputElement;
const findMaxFlowBtn = document.getElementById("find-max-flow-btn") as HTMLButtonElement;
const maxFlowStatus = document.getElementById("max-flow-status") as HTMLSpanElement;

//Arbol de recubrimiento minimo
const toggleMstBtn = document.getElementById("toggle-mst-btn") as HTMLButtonElement;
const mstStatus = document.getElementById("mst-status") as HTMLSpanElement;

//Dibujar coloreado de grafos
const colorGraphBtn = document.getElementById("color-graph-btn") as HTMLButtonElement;
const coloringStatus = document.getElementById("coloring-status") as HTMLSpanElement;

// Construir estructuras
const { graph, tree, routesTree } = BuildStructures.buildStructures(4);
const dijkstraSolver = new Dijkstra(graph); // <--- 3. INICIALIZAR SOLVER
let highlightedRoute: RouteInterface | null = null;


graph.generateMinimumSpanningTree();

const graphColoring = new GraphColoring(graph);
console.log(graphColoring.greedyColoring())


console.log(graph)
// Estado: Estación actualmente seleccionada (para resaltar)
let highlightedStation: StationInterface | null = null;

// Estado de la ruta de Dijkstra (4. NUEVO ESTADO)
let dijkstraPath: StationInterface[] | null = null;

// Estado para mostrar o no el arbol de recubrimiento minimo
let showMST = false;

// Estado para mostrar el coloreado del grafo
let coloringResult: Map<number, number> | null = null;
let showColoring = false;

// Nuevo estado para cuellos de botella
let bottleneckEdges: [number, number][] | null = null;

// estado de búsqueda por similitud y paginación

interface SearchResult {
    station: StationInterface;
    score: number; // Puntuación de similitud (0 a 1)
}

let searchResults: SearchResult[] = [];
let currentResultIndex: number = -1; // Índice del resultado actualmente visible


// control de vista (zoom/pan)


// Matriz de Transformación de Vista [scale, offsetX, offsetY]
let viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
let isPanning = false;
let lastPanPoint = { x: 0, y: 0 };

/**
 * Convierte coordenadas del mapa (Lon/Lat) a coordenadas de la pantalla (Canvas)
 * aplicando la matriz de transformación actual.
 */
function toScreenCoords(mapCoords: [number, number]): [number, number] {
    const x = mapCoords[0] * viewTransform.scale + viewTransform.offsetX;
    const y = mapCoords[1] * viewTransform.scale + viewTransform.offsetY;
    return [x, y];
}

/**
 * Convierte coordenadas de la pantalla (Canvas) a coordenadas del mapa
 * (Útil para detección de mouse/hover).
 */
function toMapCoords(screenX: number, screenY: number): [number, number] {
    const x = (screenX - viewTransform.offsetX) / viewTransform.scale;
    const y = (screenY - viewTransform.offsetY) / viewTransform.scale;
    return [x, y];
}



// función de dibujado (draw)

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // -------------------------------------------------
    // 0. PREPARACIÓN: Crear Sets de IDs de la ruta/camino para búsqueda rápida
    // -------------------------------------------------
    const routeStopsSet = new Set<number>();
    if (highlightedRoute) {
        highlightedRoute.stops.forEach(stopId => routeStopsSet.add(stopId.stationId));
    }
    if (dijkstraPath) {
        dijkstraPath.forEach(st => routeStopsSet.add(st.id));
    }

    // -------------------------------------------------
    // 1. DIBUJAR CONEXIONES (ARISTAS)
    // -------------------------------------------------
    ctx.strokeStyle = "#eee"; 
    ctx.lineWidth = 1;

    for (const [idA, neighbors] of graph.adjList.entries()) { 
        const stA = graph.stations.get(idA)!;
        if (!stA) continue;
        const [x1, y1] = toScreenCoords(stA.coords);
        
        neighbors.forEach((_weight, idB) => { 
            const stB = graph.stations.get(idB)!;
            if (stB) {
                const [x2, y2] = toScreenCoords(stB.coords);
                
                // 1b. DIBUJAR CUELLO DE BOTELLA (Aristas saturadas)
                const isBottleneck = bottleneckEdges?.some(([u, v]) => 
                    (u === idA && v === idB) || (u === idB && v === idA)
                );

                if (isBottleneck) {
                    // Si es cuello de botella, dibujamos primero con un color llamativo
                    ctx.strokeStyle = "darkred";
                    ctx.lineWidth = 4;
                } else {
                    // Si no, dibujamos normal
                    ctx.strokeStyle = "#eee"; 
                    ctx.lineWidth = 1;
                }

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                // Asegurar que las aristas de cuello de botella se dibujen encima si es necesario
                if (isBottleneck) {
                    ctx.strokeStyle = "red";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        });
    }
    //Dibujar MST solo si esta activo
        if (showMST && graph.mstEdges.length > 0) {
        ctx.strokeStyle = "#00ccff";  // azul brillante
        ctx.lineWidth = 6;
        ctx.lineCap = "round";

        graph.mstEdges.forEach(([u, v]) => {
            const stA = graph.stations.get(u);
            const stB = graph.stations.get(v);
            if (!stA || !stB) return;

            const [x1, y1] = toScreenCoords(stA.coords);
            const [x2, y2] = toScreenCoords(stB.coords);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
    }


    // -------------------------------------------------
    // 2. DIBUJAR TRAZADO DE RUTA/DIJKSTRA (LÍNEA NARANJA/PÚRPURA)
    // -------------------------------------------------
    // ... (Mantener la lógica de dibujado de highlightedRoute y dijkstraPath tal cual) ...
    
    // 2. DIBUJAR TRAZADO DE LA RUTA SELECCIONADA (LÍNEA NARANJA)
    if (highlightedRoute) {
        // ... Lógica de dibujado de highlightedRoute ...
        // (Dejado fuera por brevedad, mantienes tu código original aquí)
        
        const stops = highlightedRoute.stops;
        const firstStopId = stops[0]?.stationId;
        const firstStationType = graph.stations.get(firstStopId)?.type;
        const isSkipAllowedRoute = firstStationType === TransportTypes.transM || firstStationType === TransportTypes.metro;

        ctx.strokeStyle = "orange";
        ctx.lineWidth = 5; 
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (stops.length > 0) {
            let previousStationId: number | null = null;
            for (let i = 0; i < stops.length; i++) {
                const currentStationId = stops[i].stationId;
                const currentStation = graph.stations.get(currentStationId);
                if (!currentStation) {
                    previousStationId = null; 
                    continue;
                }
                const [x, y] = toScreenCoords(currentStation.coords);
                if (previousStationId === null) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                } else {
                    const neighbors = graph.adjList.get(previousStationId);
                    const isDirectlyConnected = neighbors && neighbors.has(currentStationId);
                    const isTMSkipOrMetroSkipAllowed = isSkipAllowedRoute;
                    if (isDirectlyConnected || isTMSkipOrMetroSkipAllowed) { 
                        ctx.lineTo(x, y);
                        ctx.stroke(); 
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                    } else {
                        ctx.beginPath();
                        ctx.moveTo(x, y); 
                    }
                }
                previousStationId = currentStationId; 
            }
        }
    }


    // 2b. DIBUJAR RUTA MÍNIMA DE DIJKSTRA (LÍNEA PÚRPURA) 
    if (dijkstraPath && dijkstraPath.length > 1) {
        for (let i = 0; i < dijkstraPath.length - 1; i++) {
            const stA = dijkstraPath[i];
            const stB = dijkstraPath[i + 1];

            const [x1, y1] = toScreenCoords(stA.coords);
            const [x2, y2] = toScreenCoords(stB.coords);

            let color = "black";
            if (stA.type === TransportTypes.transM) color = "red";
            else if (stA.type === TransportTypes.sitp) color = "blue";
            else if (stA.type === TransportTypes.metro) color = "#32ff32";
            else color = "gray"; 

            ctx.strokeStyle = color;
            ctx.lineWidth = 6;
            ctx.lineCap = "round";

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }


    // -------------------------------------------------
    // 3. DIBUJAR ESTACIONES (NODOS)
    // -------------------------------------------------
    for (const st of graph.stations.values()) {
        ctx.beginPath();
        const [x, y] = toScreenCoords(st.coords);

        const baseRadiusTM = 5;
        const baseRadiusSITP = 3;
        const baseRadiusMetro = 6;
        const highlightRadius = 8; 
        const selectedRadius = 12; 
        
        const currentRadius = (st.type === TransportTypes.sitp) 
            ? baseRadiusSITP 
            : (st.type === TransportTypes.metro ? baseRadiusMetro : baseRadiusTM);

        // ... (Lógica de resaltado de estaciones existente A, B, C) ...
        
        // A. CASO: Estación única seleccionada (Búsqueda por nombre/ID)
        if (highlightedStation && st.id === highlightedStation.id) {
            ctx.fillStyle = "red";     
            ctx.strokeStyle = "black";
            ctx.lineWidth = 3;
            ctx.arc(x, y, selectedRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } 
        // B. CASO: Estación pertenece a la ruta resaltada (Dijkstra o Route)
        else if (routeStopsSet.has(st.id)) {
            
            if (dijkstraPath && dijkstraPath.includes(st)) {
                ctx.fillStyle = "magenta"; 
                ctx.strokeStyle = "purple";
                ctx.lineWidth = 3;
                ctx.arc(x, y, highlightRadius, 0, Math.PI * 2);
            } else {
                ctx.fillStyle = "gold"; 
                ctx.strokeStyle = "darkorange";
                ctx.lineWidth = 2;
                ctx.arc(x, y, highlightRadius, 0, Math.PI * 2);
            }

            ctx.fill();
            ctx.stroke();
        } 
        // C. CASO: Estación normal
        else {

                // 🔥 SI EL COLOREADO ESTÁ ACTIVADO → usar color asignado
                if (showColoring && coloringResult && coloringResult.has(st.id)) {
                    // Generar color único para cada frecuencia
                    const bigColorPalette = [
                        "#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
                        "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
                        "#008080", "#e6beff", "#9A6324", "#fffac8", "#800000",
                        "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080",
                        "#ffffff", "#000000", "#ff7f00", "#1b9e77", "#d95f02",
                        "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d",
                        "#666666", "#1f77b4", "#ffbb78", "#2ca02c", "#98df8a",
                        "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b",
                        "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7",
                        "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"
                    ];

                    const colorId = coloringResult.get(st.id)!;
                    ctx.fillStyle = bigColorPalette[colorId % bigColorPalette.length];

                    ctx.beginPath();
                    ctx.arc(x, y, currentRadius + 3, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                // 🎨 Si NO hay coloreado, usar colores por tipo de transporte
                else {
                    if (st.type === TransportTypes.sitp) {
                        ctx.fillStyle = "rgba(0, 0, 255, 0.5)"; 
                    } 
                    else if (st.type === TransportTypes.metro) { 
                        ctx.fillStyle = "rgba(9, 224, 9, 0.8)"; 
                    } 
                    else { // Transmilenio
                        ctx.fillStyle = "rgba(227, 24, 55, 0.6)"; 
                    }

                    ctx.beginPath();
                    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }


toggleMstBtn.addEventListener("click", () => {
    
    // Si está apagado → calcular y mostrar
    if (!showMST) {
        const mst = graph.generateMinimumSpanningTree();
        graph.mstEdges = mst;
        showMST = true;
        toggleMstBtn.textContent = "Ocultar MST";
        mstStatus.textContent = ` (${mst.length} aristas)`;
    } 
    // Si está encendido → ocultar
    else {
        showMST = false;
        toggleMstBtn.textContent = "Mostrar MST";
        mstStatus.textContent = "";
    }

    draw();
});

// Dibujado inicial
draw();


// manejadores de vista (zoom/pan)


canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); // Evita el scroll de la página

    const zoomIntensity = 0.1;
    const mouseX = e.clientX - canvas.getBoundingClientRect().left;
    const mouseY = e.clientY - canvas.getBoundingClientRect().top;

    // 1. Calcular las coordenadas del mapa en el punto del mouse (antes del zoom)
    const [mapX, mapY] = toMapCoords(mouseX, mouseY);
    
    // 2. Aplicar el nuevo factor de escala
    const scaleFactor = (e.deltaY < 0) ? (1 + zoomIntensity) : (1 - zoomIntensity);
    viewTransform.scale *= scaleFactor;

    // Opcional: Limitar el zoom para evitar que se pierda o sea demasiado grande
    viewTransform.scale = Math.max(0.1, Math.min(viewTransform.scale, 20)); 

    // 3. Re-calcular el offset para mantener el punto del mouse fijo (ZOOM CENTERED)
    viewTransform.offsetX = mouseX - mapX * viewTransform.scale;
    viewTransform.offsetY = mouseY - mapY * viewTransform.scale;

    draw();
}, { passive: false });


//Paneo (arrastrar)
canvas.addEventListener('mousedown', (e) => {
    isPanning = true;
    lastPanPoint = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
    // Lógica de Paneo
    if (isPanning) {
        const dx = e.clientX - lastPanPoint.x;
        const dy = e.clientY - lastPanPoint.y;

        viewTransform.offsetX += dx;
        viewTransform.offsetY += dy;

        lastPanPoint = { x: e.clientX, y: e.clientY };
        draw();
    }
    
    // Lógica de HOVER (Mantenida)
    handleHover(e);
});

canvas.addEventListener('mouseup', () => {
    isPanning = false;
    canvas.style.cursor = viewTransform.scale > 1 ? 'grab' : 'default';
});

canvas.addEventListener('mouseleave', () => {
    isPanning = false;
    tooltip.style.display = "none";
    canvas.style.cursor = 'default';
});

//Función auxiliar para centrar la vista en una estación
function centerOnStation(station: StationInterface) {
    // Usamos la escala actual (o ajustamos a una escala de zoom decente si es 1)
    const currentScale = viewTransform.scale > 1.5 ? viewTransform.scale : 4; 
    
    // El punto de la estación debe mapearse al centro del lienzo
    const targetScreenX = canvas.width / 2;
    const targetScreenY = canvas.height / 2;

    viewTransform.scale = currentScale;
    
    // offsetX = targetScreenX - mapX * scale
    viewTransform.offsetX = targetScreenX - station.coords[0] * currentScale;
    viewTransform.offsetY = targetScreenY - station.coords[1] * currentScale;

    draw(); // Redibujar después de centrar
}


// utilidades de búsqueda por similitud


/**
 * Normaliza una cadena para la búsqueda (minúsculas, sin espacios extra ni tildes).
 */
function normalizeString(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Calcula la puntuación de similitud basada en la Distancia de Levenshtein.
 * La puntuación es 1 - (Distancia / Longitud Máxima), donde 1 es idéntico.
 */
function levenshteinDistance(a: string, b: string): number {
    const n = a.length;
    const m = b.length;

    if (n === 0) return m > 0 ? 0 : 1; // Si una es vacía, el score es 0 a menos que ambas lo sean.
    if (m === 0) return n > 0 ? 0 : 1;

    const matrix = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = 0; i <= n; i++) matrix[i][0] = i;
    for (let j = 0; j <= m; j++) matrix[0][j] = j;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = (a[i - 1] === b[j - 1]) ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, 
                matrix[i][j - 1] + 1, 
                matrix[i - 1][j - 1] + cost 
            );
        }
    }

    const distance = matrix[n][m];
    const maxLength = Math.max(n, m);
    // Retorna la puntuación de similitud
    return 1 - (distance / maxLength); 
}



// lógica de búsqueda y paginación
function searchStations() {
    const query = searchInput.value.trim(); 
    if (!query) return;

    // Limpiamos la ruta de Dijkstra si se inicia una nueva búsqueda general
    dijkstraPath = null;
    dijkstraStatus.textContent = "";

    // A. Búsqueda por ID de Estación (Numérico)
    if (!isNaN(Number(query))) {
        const id = Number(query);
        const foundNode = tree.search(id);
        
        if (foundNode) {
            highlightedRoute = null; 
            searchResults = [{ station: foundNode, score: 1.0 }];
            showResult(0);
            nextBtn.disabled = true;
            return;
        }
    }
    
    // B. Búsqueda por ID de Ruta (Ej: "B1", "L82")
    const routeQuery = query.toUpperCase(); 
    const foundRoute = routesTree.search(routeQuery); 

    if (foundRoute) {
        //console.log("Ruta encontrada, validando integridad...");

        const validationResult = graph.checkRouteValidity(
            {
               ...foundRoute
            });

        if (validationResult.isValid) {
            //RUTA VÁLIDA: Se asigna la ruta para dibujar
            highlightedRoute = foundRoute;
            highlightedStation = null; 
            searchResults = []; 
            paginationStatus.textContent = `Ruta: ${foundRoute.routeId} - Valida`; 
        } else {
            // ❌ RUTA INVÁLIDA
            highlightedRoute = null; 
            highlightedStation = null;
            searchResults = [];

            const errorMessage = validationResult.errorDetail || `Ruta ${foundRoute.routeId} inválida por una conexión faltante.`;
            alert(errorMessage); 
            console.error(errorMessage);

            paginationStatus.textContent = `Ruta: ${foundRoute.routeId} - Invalida`;
        }
        
        draw();
        return;
    }

    

    // C. Búsqueda por Similitud de Nombre de Estación 
    highlightedRoute = null; // Limpiamos ruta si busca estación
    searchResults = searchStationsBySimilarity(query);
    currentResultIndex = -1; 

    if (searchResults.length > 0) {
        showResult(0);
        nextBtn.disabled = searchResults.length <= 1;
    } else {
        alert("No se encontró estación ni ruta con ese criterio.");
        highlightedStation = null;
        highlightedRoute = null;
        paginationStatus.textContent = "";
        nextBtn.disabled = true;
        draw(); 
    }
}

/**
 * Muestra el resultado de búsqueda en el índice dado, actualiza el mapa y la paginación.
 */
function showResult(index: number) {
    if (index >= 0 && index < searchResults.length) {
        currentResultIndex = index;
        const result = searchResults[currentResultIndex];
        const stationToShow = result.station;

        highlightedStation = stationToShow;
        //console.log(`Resultado ${index + 1}/${searchResults.length} (Score: ${result.score.toFixed(3)}):`, stationToShow.name);
        
        centerOnStation(stationToShow); 

        paginationStatus.textContent = `(${currentResultIndex + 1} de ${searchResults.length})`;
        
        nextBtn.disabled = (currentResultIndex === searchResults.length - 1);

        draw(); 
    }
}

/**
 * Función central que realiza la búsqueda de todas las estaciones por similitud.
 */
function searchStationsBySimilarity(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const normalizedQuery = normalizeString(query);
    const MIN_SCORE = 0.55; // Umbral mínimo de similitud

    for (const st of graph.stations.values()) {
        const normalizedName = normalizeString(st.name);
        
        const score = levenshteinDistance(normalizedQuery, normalizedName);
        
        if (score >= MIN_SCORE) { 
            // Usamos el B+ Tree para obtener la estación (aunque en este caso ya la tenemos)
            const fullStation = tree.search(st.id); 
            if (fullStation) {
                results.push({ station: fullStation, score: score });
            }
        }
    }

    // Ordenar los resultados por puntuación descendente
    results.sort((a, b) => b.score - a.score);
    
    return results;
}

// ------------------------------------------
// LÓGICA DE DIJKSTRA (5. FUNCIÓN PRINCIPAL)
// ------------------------------------------

function findShortestRoute() {
    // 1. Limpiar estados
    dijkstraPath = null;
    highlightedRoute = null; 
    highlightedStation = null;
    dijkstraStatus.textContent = "Calculando...";

    // 2. Obtener y validar IDs
    const startId = Number(startStationInput.value.trim());
    const endId = Number(endStationInput.value.trim());

    if (isNaN(startId) || isNaN(endId) || startId <= 0 || endId <= 0) {
        dijkstraStatus.textContent = "❌ IDs inválidos. Ingrese IDs de estación válidos.";
        draw();
        return;
    }
    
    if (startId === endId) {
        dijkstraStatus.textContent = "💡 Origen y Destino son la misma estación (Tiempo: 0 min).";
        draw();
        return;
    }

    // 3. Ejecutar Dijkstra
    const result = dijkstraSolver.findShortestPath(startId, endId);

    // 4. Mostrar resultado
    if (result) {
        dijkstraPath = result.path;
        dijkstraStatus.textContent = ` Ruta encontrada. Tiempo total: ${result.totalTime.toFixed(2)} minutos.`;
        
        // Centrar en la estación de destino
        centerOnStation(result.path[result.path.length - 1]);
    } else {
        dijkstraPath = null;
        dijkstraStatus.textContent = "❌ No se encontró ruta. Verifique los IDs o la conectividad.";
    }

    draw();
}

function findMaxFlow() {
    // 1. Limpiar estados de otras visualizaciones
    dijkstraPath = null;
    highlightedRoute = null;
    highlightedStation = null;
    maxFlowStatus.textContent = "Analizando capacidad...";
    
    // 2. Obtener y validar IDs (usamos las mismas estaciones, pero los pesos son CAPACITY)
    const startId = Number(flowStartInput.value.trim());
    const endId = Number(flowEndInput.value.trim());

    if (isNaN(startId) || isNaN(endId) || startId <= 0 || endId <= 0 || startId === endId) {
        maxFlowStatus.textContent = "❌ Ingrese IDs válidos para Origen y Destino.";
        bottleneckEdges = null;
        draw();
        return;
    }
    
    // 3. Ejecutar el análisis de Flujo Máximo
    const result = graph.findMaxFlowAnalysis(startId, endId);

    // 4. Mostrar y almacenar el resultado
    if (result.maxFlow > 0) {
        bottleneckEdges = result.bottleneckEdges;
        const sourceName = graph.stations.get(startId)?.name || 'Origen';
        const sinkName = graph.stations.get(endId)?.name || 'Destino';
        
        maxFlowStatus.innerHTML = ` Flujo Máximo (${sourceName} → ${sinkName}): 
            <span style="font-weight: bold;">${result.maxFlow.toFixed(0)}</span> unidades/hora. 
            Cuellos de Botella: ${bottleneckEdges.length}.`;
            
        // Centrar la vista para un mejor análisis
        const sinkStation = graph.stations.get(endId);
        if (sinkStation) centerOnStation(sinkStation);

    } else {
        bottleneckEdges = null;
        maxFlowStatus.textContent = "❌ No hay camino de flujo entre las estaciones o capacidad es cero.";
    }

    draw();
}


// ------------------------------------------
// MANEJADORES DE EVENTOS
// ------------------------------------------
findMaxFlowBtn.addEventListener('click', findMaxFlow);
searchBtn.addEventListener('click', searchStations);

nextBtn.addEventListener('click', () => {
    showResult(currentResultIndex + 1);
});

clearBtn.addEventListener('click', () => {
    highlightedStation = null;
    highlightedRoute = null;
    dijkstraPath = null; // Limpiar Dijkstra
    searchInput.value = "";
    startStationInput.value = ""; // Limpiar inputs de Dijkstra
    endStationInput.value = "";
    searchResults = [];
    currentResultIndex = -1;
    paginationStatus.textContent = "";
    dijkstraStatus.textContent = "";
    nextBtn.disabled = true;
    flowStartInput.value = ""; // Limpiar inputs de Flujo Máximo
    flowEndInput.value = "";
    bottleneckEdges = null; // Limpiar aristas de cuello de botella
    maxFlowStatus.textContent = "";

    //Restablecer la vista a la configuración inicial
    viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
    draw();
});

// NUEVO: Manejador para el botón de Dijkstra (6. EVENT LISTENER)
findRouteBtn.addEventListener('click', findShortestRoute);
colorGraphBtn.addEventListener("click", () => {

    if (!showColoring) {
        const gc = new GraphColoring(graph);
        coloringResult = gc.greedyColoring();
        showColoring = true;

        coloringStatus.textContent = "✔ Coloreado aplicado.";
        colorGraphBtn.textContent = "Ocultar Coloreado";
    } else {
        showColoring = false;
        coloringStatus.textContent = "";
        colorGraphBtn.textContent = "Aplicar Coloreado";
    }

    draw();
});


// interactividad (hover)
function handleHover(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: StationInterface | null = null;

    for (const st of graph.stations.values()) {
        const [screenX, screenY] = toScreenCoords(st.coords);
        
        const dx = x - screenX;
        const dy = y - screenY;
        
        const radius = (highlightedStation && st.id === highlightedStation.id) ? 10 : 6;
        
        if (dx * dx + dy * dy <= radius * radius) {
            found = st;
            break; 
        }
    }

    if (found) {
        tooltip.style.left = (e.pageX + 10) + "px";
        tooltip.style.top = (e.pageY + 10) + "px";
        
        let typeInfo = '';
        if (found.type === TransportTypes.sitp) {
            typeInfo = `Línea/Zona: ${found.lineName || 'N/A'}`;
        } else if(found.type === TransportTypes.metro){
             typeInfo = `Línea/Zona: ${found.lineName || 'N/A'}`;
        }
        else {
            typeInfo = `Troncal: ${found.troncal || 'N/A'}`;
        }
        
        tooltip.innerHTML = `<strong>${found.name}</strong><br>ID: ${found.id}<br>${typeInfo}`;
        tooltip.style.display = "block";
        canvas.style.cursor = "pointer";
    } else {
        tooltip.style.display = "none";
        if (!isPanning) {
            canvas.style.cursor = viewTransform.scale > 1 ? 'grab' : 'default';
        }
    }
}