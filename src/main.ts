// /src/main.ts
import { Dijkstra } from "./algorithms/dijkstra";
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

// Construir estructuras
const { graph, tree, routesTree } = BuildStructures.buildStructures(4);
const dijkstraSolver = new Dijkstra(graph); // <--- 3. INICIALIZAR SOLVER

let highlightedRoute: RouteInterface | null = null;
console.log(graph)

// Estado: Estación actualmente seleccionada (para resaltar)
let highlightedStation: StationInterface | null = null;

// Estado de la ruta de Dijkstra (4. NUEVO ESTADO)
let dijkstraPath: StationInterface[] | null = null;


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
    // 0. PREPARACIÓN: Crear un Set de IDs de la ruta actual para búsqueda rápida
    // -------------------------------------------------
    const routeStopsSet = new Set<number>();
    if (highlightedRoute) {
        highlightedRoute.stops.forEach(stopId => routeStopsSet.add(stopId.stationId));
    }
    // Agregar el camino de Dijkstra al set para resaltado (NUEVO)
    if (dijkstraPath) {
        dijkstraPath.forEach(st => routeStopsSet.add(st.id));
    }

    // -------------------------------------------------
    // 1. DIBUJAR CONEXIONES (ARISTAS) <--- LÓGICA CORREGIDA Y VISIBLE
    // -------------------------------------------------
    ctx.strokeStyle = "#eee"; // Un gris más claro para que resalte la ruta
    ctx.lineWidth = 1;

    for (const [idA, neighbors] of graph.adjList.entries()) { // idA es el ID de la estación de origen
        const stA = graph.stations.get(idA)!;
        if (!stA) continue;
        const [x1, y1] = toScreenCoords(stA.coords);
        
        // CORRECCIÓN: Usar el key (idB) para buscar la estación vecina (Map.forEach(value, key))
        neighbors.forEach((_weight, idB) => { 
            const stB = graph.stations.get(idB)!; // ✅ CORRECTO: Usamos idB (la clave)
            if (stB) {
                const [x2, y2] = toScreenCoords(stB.coords);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        });
    }

    // -------------------------------------------------
    // 2. DIBUJAR TRAZADO DE LA RUTA SELECCIONADA (LÍNEA NARANJA)
    // -------------------------------------------------
    if (highlightedRoute) {
        
        const stops = highlightedRoute.stops;
        
        // --- LÓGICA DE DERECHO A SALTO (TM o Metro) ---
        const firstStopId = stops[0]?.stationId;
        const firstStationType = graph.stations.get(firstStopId)?.type;
        
        const isSkipAllowedRoute = 
            firstStationType === TransportTypes.transM || 
            firstStationType === TransportTypes.metro;
        // ---------------------------------------------------

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
                    //console.warn(`Estación ID ${currentStationId} de la ruta no encontrada.`);
                    previousStationId = null; // Reiniciar la conexión si una parada es inválida
                    continue;
                }

                const [x, y] = toScreenCoords(currentStation.coords);
                
                // Si es la primera parada, solo movemos el cursor
                if (previousStationId === null) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                } else {
                    const neighbors = graph.adjList.get(previousStationId);
                    const isDirectlyConnected = neighbors && neighbors.has(currentStationId);
                    
                    const isTMSkipOrMetroSkipAllowed = isSkipAllowedRoute; 
                    
                    if (isDirectlyConnected || isTMSkipOrMetroSkipAllowed) { 
                        // Dibujamos la línea
                        //if (!isDirectlyConnected && isTMSkipOrMetroSkipAllowed) {
                        //    console.log(`Dibujando salto (${firstStationType}) en ${highlightedRoute.routeId}: ${previousStationId} -> ${currentStationId}`);
                        //}
                        
                        ctx.lineTo(x, y);
                        ctx.stroke(); // Dibuja el segmento actual
                        
                        // Movemos a la posición de inicio para el siguiente segmento
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                    } else {
                        // Si NO hay conexión y NO es TM/Metro, cortamos la línea
                        //console.warn(`Ruta ${highlightedRoute.routeId} inválida (Fallo de dibujo): No hay conexión en el grafo entre ${previousStationId} y ${currentStationId}.`);
                        ctx.beginPath();
                        ctx.moveTo(x, y); // El siguiente segmento comenzará desde aquí
                    }
                }
                
                previousStationId = currentStationId; // Actualizar para el siguiente paso
            }
        }
    }

    // 2b. DIBUJAR RUTA MÍNIMA DE DIJKSTRA (LÍNEA PÚRPURA) (NUEVO)
    if (dijkstraPath && dijkstraPath.length > 1) {
    
    for (let i = 0; i < dijkstraPath.length - 1; i++) {
        const stA = dijkstraPath[i];
        const stB = dijkstraPath[i + 1];

        const [x1, y1] = toScreenCoords(stA.coords);
        const [x2, y2] = toScreenCoords(stB.coords);

        // --- COLOR SEGÚN EL TIPO DE TRANSPORTE ---
        let color = "black";

        if (stA.type === TransportTypes.transM) color = "red";
        else if (stA.type === TransportTypes.sitp) color = "blue";
        else if (stA.type === TransportTypes.metro) color = "#32ff32";
        else color = "gray"; // caminar o desconocido

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
        const highlightRadius = 8; // Radio para estaciones de la ruta
        const selectedRadius = 12; // Radio extra grande para estación única seleccionada
        
        const currentRadius = (st.type === TransportTypes.sitp) 
            ? baseRadiusSITP 
            : (st.type === TransportTypes.metro ? baseRadiusMetro : baseRadiusTM);

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
                // Nodo en la ruta mínima
                ctx.fillStyle = "magenta"; 
                ctx.strokeStyle = "purple";
                ctx.lineWidth = 3;
                ctx.arc(x, y, highlightRadius, 0, Math.PI * 2);
            } else {
                 // Color de parada de ruta normal
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
            // Estilo normal (algo más transparente u opaco)
            if (st.type === TransportTypes.sitp) {
                ctx.fillStyle = "rgba(0, 0, 255, 0.5)"; // Azul con transparencia
                ctx.arc(x, y, currentRadius, 0, Math.PI * 2); 
            } 
            else if (st.type === TransportTypes.metro) { 
                ctx.fillStyle = "rgba(9, 224, 9, 0.8)"; 
                ctx.arc(x, y, currentRadius, 0, Math.PI * 2); 
            } 
            else { // Transmilenio
                ctx.fillStyle = "rgba(227, 24, 55, 0.6)"; 
                ctx.arc(x, y, currentRadius, 0, Math.PI * 2); 
            }
            ctx.fill();
        }
    }
}

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


/**
 * Ejecuta la búsqueda por similitud o ID y gestiona los resultados.
 */
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
        dijkstraStatus.textContent = `✅ Ruta encontrada. Tiempo total: ${result.totalTime.toFixed(2)} minutos.`;
        
        // Centrar en la estación de destino
        centerOnStation(result.path[result.path.length - 1]);
    } else {
        dijkstraPath = null;
        dijkstraStatus.textContent = "❌ No se encontró ruta. Verifique los IDs o la conectividad.";
    }

    draw();
}


// ------------------------------------------
// MANEJADORES DE EVENTOS
// ------------------------------------------
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
    
    //Restablecer la vista a la configuración inicial
    viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
    draw();
});

// NUEVO: Manejador para el botón de Dijkstra (6. EVENT LISTENER)
findRouteBtn.addEventListener('click', findShortestRoute);


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