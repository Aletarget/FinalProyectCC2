import { BuildTMStructures } from "./Btree+/buildFromData";
import { StationInterface } from "./interfaces/Stations.interface";
import { TransportTypes } from "./interfaces/types.enum";

// Referencias al DOM
const canvas = document.getElementById("map") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const tooltip = document.getElementById("tooltip") as HTMLDivElement;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const searchBtn = document.getElementById("search-btn") as HTMLButtonElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;

// Construir estructuras
const { graph, tree } = BuildTMStructures.buildTMStructures(4);
console.log(tree)

// Estado: Estación actualmente seleccionada (para resaltar)
let highlightedStation: StationInterface | null = null;


// ==========================================
// CONTROL DE VISTA (ZOOM/PAN)
// ==========================================

// Matriz de Transformación de Vista [scale, offsetX, offsetY]
let viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
let isPanning = false;
let lastPanPoint = { x: 0, y: 0 };

/**
 * Convierte coordenadas del mapa (Lon/Lat) a coordenadas de la pantalla (Canvas)
 * aplicando la matriz de transformación actual.
 * @param mapCoords [Lon, Lat] de la estación
 * @returns [ScreenX, ScreenY]
 */
function toScreenCoords(mapCoords: [number, number]): [number, number] {
    const x = mapCoords[0] * viewTransform.scale + viewTransform.offsetX;
    const y = mapCoords[1] * viewTransform.scale + viewTransform.offsetY;
    return [x, y];
}

/**
 * Convierte coordenadas de la pantalla (Canvas) a coordenadas del mapa
 * (Útil para detección de mouse/hover).
 * @param screenX Coordenada X del mouse en el lienzo
 * @param screenY Coordenada Y del mouse en el lienzo
 * @returns [MapX, MapY]
 */
function toMapCoords(screenX: number, screenY: number): [number, number] {
    const x = (screenX - viewTransform.offsetX) / viewTransform.scale;
    const y = (screenY - viewTransform.offsetY) / viewTransform.scale;
    return [x, y];
}


// ==========================================
// FUNCIÓN DE DIBUJADO (DRAW)
// ==========================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. DIBUJAR CONEXIONES
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 2;

    for (const [id, neighbors] of graph.adjList.entries()) {
        const stA = graph.stations.get(id)!;
        const [x1, y1] = toScreenCoords(stA.coords); // ⬅️ APLICAR TRANSFORMACIÓN
        
        neighbors.forEach(nb => {
            const stB = graph.stations.get(nb)!;
            const [x2, y2] = toScreenCoords(stB.coords); // ⬅️ APLICAR TRANSFORMACIÓN

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
    }

    // 2. DIBUJAR ESTACIONES
    for (const st of graph.stations.values()) {
        ctx.beginPath();
        const [x, y] = toScreenCoords(st.coords); // ⬅️ APLICAR TRANSFORMACIÓN

        // El radio del punto debe escalarse inversamente para que no crezca con el zoom.
        // Opcional: Mantener un radio fijo que se vea bien en todos los zooms.
        const baseRadiusTM = 5;
        const baseRadiusSITP = 3;
        const baseRadiusMetro = 6;
        const highlightRadius = 10;
        
        const currentRadius = (st.type === TransportTypes.sitp) 
            ? baseRadiusSITP 
            : (st.type === TransportTypes.metro ? baseRadiusMetro : baseRadiusTM);

        // Si es la estación resaltada, cambiamos estilo
        if (highlightedStation && st.id === highlightedStation.id) {
            ctx.fillStyle = "gold";      
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.arc(x, y, highlightRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            // Estilo normal
            if (st.type === TransportTypes.sitp) {
                ctx.fillStyle = "blue"; 
                ctx.arc(x, y, currentRadius, 0, Math.PI * 2); 
            } 
            else if (st.type === TransportTypes.metro) { 
                ctx.fillStyle = "#09e009"; 
                ctx.arc(x, y, currentRadius, 0, Math.PI * 2); 
            } 
            else {
                ctx.fillStyle = "#e31837"; 
                ctx.arc(x, y, currentRadius, 0, Math.PI * 2); 
            }
            
            ctx.fill();
        }
    }
}

// Dibujado inicial
draw();


// ==========================================
// MANEJADORES DE VISTA (ZOOM/PAN)
// ==========================================

// 🔄 Zoom con la rueda del mouse
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


// 🖱️ Paneo (arrastrar)
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

// ==========================================
// LÓGICA DE BÚSQUEDA Y LIMPIEZA
// ==========================================
searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (!query) return;

    let foundNode: StationInterface | null = null;

    if (!isNaN(Number(query))) {
        const id = Number(query);
        console.log(`Buscando ID: ${id} en Árbol B+...`);
        foundNode = tree.search(id);
    } 
    else {
        const nameQuery = query.toLowerCase();
        for (const st of graph.stations.values()) {
            if (st.name.toLowerCase().includes(nameQuery)) {
                foundNode = tree.search(st.id); 
                break;
            }
        }
    }

    if (foundNode) {
        highlightedStation = foundNode;
        console.log("Estación encontrada:", foundNode);
        
        // 🚀 CENTRAR LA VISTA EN LA ESTACIÓN ENCONTRADA
        centerOnStation(foundNode); 

        draw(); 
    } else {
        alert("Estación no encontrada :(");
        highlightedStation = null;
        draw(); 
    }
});

clearBtn.addEventListener('click', () => {
    highlightedStation = null;
    searchInput.value = "";
    // 🔄 Restablecer la vista a la configuración inicial
    viewTransform = { scale: 1, offsetX: 0, offsetY: 0 };
    draw();
});

// 🌟 Función auxiliar para centrar la vista en una estación
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


// ==========================================
// INTERACTIVIDAD (HOVER) - Lógica movida a función
// ==========================================

function handleHover(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: StationInterface | null = null;

    for (const st of graph.stations.values()) {
        // Convertir las coordenadas de la estación al espacio de la pantalla
        const [screenX, screenY] = toScreenCoords(st.coords);
        
        const dx = x - screenX;
        const dy = y - screenY;
        
        // El radio de detección se basa en el radio de dibujo
        const radius = (highlightedStation && st.id === highlightedStation.id) ? 10 : 6;
        
        if (dx * dx + dy * dy <= radius * radius) {
            found = st;
            // 💡 Nota: Una búsqueda más precisa podría usar el árbol para obtener el objeto completo,
            // pero usar el Map 'graph.stations' es suficiente aquí.
            break; 
        }
    }

    if (found) {
        tooltip.style.left = (e.pageX + 10) + "px";
        tooltip.style.top = (e.pageY + 10) + "px";
        
        // Lógica para el Tooltip: CORREGIDA Y REVISADA
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

// Reemplazar el event listener 'mousemove' por la nueva lógica de 'mousemove' unificada
canvas.removeEventListener("mousemove", (e) => handleHover(e)); // Asegurar que el viejo hover no se ejecute si existía
// El nuevo 'mousemove' ya está definido arriba e incluye `handleHover(e)` dentro del if `!isPanning`