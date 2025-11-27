import { buildTMStructures } from "./Btree+/buildFromData";
import { StationTMInterface } from "./interfaces/StationTM.interface";

// Referencias al DOM
const canvas = document.getElementById("map") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const tooltip = document.getElementById("tooltip") as HTMLDivElement;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const searchBtn = document.getElementById("search-btn") as HTMLButtonElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;

// Construir estructuras
const { graph, tree } = buildTMStructures(4);

// Estado: Estación actualmente seleccionada (para resaltar)
let highlightedStation: StationTMInterface | null = null;


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
    neighbors.forEach(nb => {
      const stB = graph.stations.get(nb)!;
      ctx.beginPath();
      ctx.moveTo(stA.coords[0], stA.coords[1]);
      ctx.lineTo(stB.coords[0], stB.coords[1]);
      ctx.stroke();
    });
  }

  // 2. DIBUJAR ESTACIONES
  for (const st of graph.stations.values()) {
    ctx.beginPath();
    
    // Si es la estación resaltada, cambiamos estilo
    if (highlightedStation && st.id === highlightedStation.id) {
        ctx.fillStyle = "gold";      // Color de resalte
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.arc(st.coords[0], st.coords[1], 10, 0, Math.PI * 2); // Más grande
        ctx.fill();
        ctx.stroke();
    } else {
        // Estilo normal (¡CORRECCIÓN AQUÍ: Eliminamos la referencia a st.estado!)
        ctx.fillStyle = "#e31837"; // Usamos el rojo Transmilenio por defecto
        ctx.arc(st.coords[0], st.coords[1], 5, 0, Math.PI * 2);
        ctx.fill();
    }
  }
}

// Dibujado inicial
draw();

// ==========================================
// LÓGICA DE BÚSQUEDA
// ==========================================
// ==========================================
// LÓGICA DE BÚSQUEDA (CORREGIDA)
// ==========================================
searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (!query) return;

    let foundNode: StationTMInterface | null = null;

    // A. Búsqueda por ID (Si es número)
    if (!isNaN(Number(query))) {
        const id = Number(query);
        console.log(`Buscando ID: ${id} en Árbol B+...`);
        foundNode = tree.search(id); // Usamos tu árbol corregido
    } 
    // B. Búsqueda por Nombre (Texto)
    else {
        // Buscamos el ID por nombre en el grafo (linear search)
        const nameQuery = query.toLowerCase();
        for (const st of graph.stations.values()) {
            if (st.name.toLowerCase().includes(nameQuery)) {
                // Obtenemos los detalles de la estación usando el Árbol B+
                foundNode = tree.search(st.id); 
                break; // Nos quedamos con la primera coincidencia
            }
        }
        
        // ❌ ELIMINADO EL CÓDIGO INVÁLIDO Y SIN SENTIDO AQUÍ
        // ❌ if(!foundNode) throw new Error("Estacion no encontrada :(");
        // ❌ const addStation = document.getElementsByClassName('controls');
        // ❌ addStation.innerHtml
    }

    // El manejo de si se encuentra o no se hace fuera del bloque condicional
    if (foundNode) {
        highlightedStation = foundNode;
        console.log("Estación encontrada:", foundNode);
        draw(); // Redibujar para mostrar el resalte
        
        // Opcional: Centrar vista o mostrar alerta
        // alert(`Encontrada: ${foundNode.name}`);
    } else {
        alert("Estación no encontrada 😔");
        highlightedStation = null;
        draw(); // Limpiar resalte
    }
});

clearBtn.addEventListener('click', () => {
    highlightedStation = null;
    searchInput.value = "";
    draw();
});

// ==========================================
// INTERACTIVIDAD (HOVER)
// ==========================================
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let found: StationTMInterface | null = null;

  for (const st of graph.stations.values()) {
    const dx = x - st.coords[0];
    const dy = y - st.coords[1];
    // Aumentamos un poco el radio de detección para facilitar el hover
    const radius = (highlightedStation && st.id === highlightedStation.id) ? 10 : 6;
    
    if (dx * dx + dy * dy <= radius * radius) {
      found = st;
      break;
    }
  }

  if (found) {
    tooltip.style.left = (e.pageX + 10) + "px"; // pageX maneja mejor el scroll que clientX
    tooltip.style.top = (e.pageY + 10) + "px";
    
    // Mostramos ID y Nombre para verificar
    tooltip.innerHTML = `<strong>${found.name}</strong><br>ID: ${found.id}<br>Troncal: ${found.troncal}`;
    tooltip.style.display = "block";
    canvas.style.cursor = "pointer";
  } else {
    tooltip.style.display = "none";
    canvas.style.cursor = "default";
  }
});