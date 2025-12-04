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

// Construir estructuras
const { graph, tree, routesTree } = BuildStructures.buildStructures(4);
let highlightedRoute: RouteInterface | null = null;
console.log(routesTree)

// Estado: Estación actualmente seleccionada (para resaltar)
let highlightedStation: StationInterface | null = null;


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

    // -------------------------------------------------
    // 1. DIBUJAR CONEXIONES (ARISTAS)
    // -------------------------------------------------
    ctx.strokeStyle = "#eee"; // Un gris más claro para que resalte la ruta
    ctx.lineWidth = 1;

    for (const [id, neighbors] of graph.adjList.entries()) {
        const stA = graph.stations.get(id)!;
        if (!stA) continue;
        const [x1, y1] = toScreenCoords(stA.coords);
        
        neighbors.forEach(nb => {
            const stB = graph.stations.get(nb)!;
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
        ctx.strokeStyle = "orange";
        ctx.lineWidth = 5; // Más grueso
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();

        let first = true;
        for (const stopId of highlightedRoute.stops) {
            const st = graph.stations.get(stopId.stationId);
            if (st) {
                const [x, y] = toScreenCoords(st.coords);
                if (first) {
                    ctx.moveTo(x, y);
                    first = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();
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
        // B. CASO: Estación pertenece a la ruta resaltada
        else if (routeStopsSet.has(st.id)) {
            ctx.fillStyle = "gold"; // Color de parada de ruta
            ctx.strokeStyle = "darkorange";
            ctx.lineWidth = 2;
            ctx.arc(x, y, highlightRadius, 0, Math.PI * 2);
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
    const query = searchInput.value.trim(); // No normalizar todavía para respetar mayúsculas si es necesario
    if (!query) return;

    // A. Búsqueda por ID de Estación (Numérico)
    if (!isNaN(Number(query))) {
        const id = Number(query);
        const foundNode = tree.search(id);
        
        if (foundNode) {
            // Limpiamos ruta anterior
            highlightedRoute = null; 
            searchResults = [{ station: foundNode, score: 1.0 }];
            showResult(0);
            nextBtn.disabled = true;
            return;
        }
    }
    
    // B. Búsqueda por Código de Ruta (String exacto en routesTree)
    // Intentamos buscar tal cual, o en mayúsculas (ej: "a60" -> "A60")
    const routeQuery = query.toUpperCase(); 
    const foundRoute = routesTree.search(routeQuery);

    if (foundRoute) {
        console.log("Ruta encontrada:", foundRoute);
        highlightedRoute = foundRoute;
        highlightedStation = null; // Quitamos selección de estación única
        searchResults = []; // Limpiamos resultados de estaciones
        paginationStatus.textContent = `Ruta: ${foundRoute.routeId}`; // O .name
        
        draw(); // Redibujar mapa con la ruta
        return;
    }

    // C. Búsqueda por Similitud de Nombre de Estación (Tu lógica existente)
    // Si no es ID ni Ruta, asumimos que busca una estación por nombre
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
        console.log(`Resultado ${index + 1}/${searchResults.length} (Score: ${result.score.toFixed(3)}):`, stationToShow.name);
        
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
    const MIN_SCORE = 0.5; // Umbral mínimo de similitud

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
// MANEJADORES DE EVENTOS
// ------------------------------------------
searchBtn.addEventListener('click', searchStations);

nextBtn.addEventListener('click', () => {
    showResult(currentResultIndex + 1);
});

clearBtn.addEventListener('click', () => {
    highlightedStation = null;
    highlightedRoute = null;
    searchInput.value = "";
    searchResults = [];
    currentResultIndex = -1;
    paginationStatus.textContent = "";
    nextBtn.disabled = true;
    
    //Restablecer la vista a la configuración inicial
    viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
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