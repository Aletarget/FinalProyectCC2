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
        ctx.fillStyle = "gold";     // Color de resalte
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.arc(st.coords[0], st.coords[1], 10, 0, Math.PI * 2); // Más grande
        ctx.fill();
        ctx.stroke();
    } else {
        // Estilo normal: Diferenciar por tipo de transporte
        if (st.type === TransportTypes.sitp) {
          ctx.fillStyle = "blue"; // 🔵 Color azul para SITP
          ctx.arc(st.coords[0], st.coords[1], 3, 0, Math.PI * 2); // SITP: radio más pequeño (ej. 3px)
        } else {
          // Asumimos TransMilenio (o cualquier otro no SITP)
          ctx.fillStyle = "#e31837"; // 🔴 Color rojo TransMilenio
          ctx.arc(st.coords[0], st.coords[1], 5, 0, Math.PI * 2); // TM: radio estándar (ej. 5px)
        }
        ctx.fill();
    }
   }
}

// Dibujado inicial
draw();

// ==========================================
// LÓGICA DE BÚSQUEDA (CORREGIDA)
// ==========================================
searchBtn.addEventListener('click', () => {
   const query = searchInput.value.trim();
   if (!query) return;

   let foundNode: StationInterface | null = null;

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
   }

   // El manejo de si se encuentra o no se hace fuera del bloque condicional
   if (foundNode) {
      highlightedStation = foundNode;
      console.log("Estación encontrada:", foundNode);
      draw(); // Redibujar para mostrar el resalte
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

  let found: StationInterface | null = null;

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
   
   // Lógica para el Tooltip: Diferenciar la información según el tipo de transporte
    let typeInfo = '';
    if (found.type === TransportTypes.sitp) {
        typeInfo = `Línea/Zona: ${found.lineName || 'N/A'}`; // Mostrar lineName para SITP
    } else {
        typeInfo = `Troncal: ${found.troncal || 'N/A'}`; // Mostrar troncal para TM
    }
   
   tooltip.innerHTML = `<strong>${found.name}</strong><br>ID: ${found.id}<br>${typeInfo}`;
   tooltip.style.display = "block";
   canvas.style.cursor = "pointer";
  } else {
   tooltip.style.display = "none";
   canvas.style.cursor = "default";
  }
});