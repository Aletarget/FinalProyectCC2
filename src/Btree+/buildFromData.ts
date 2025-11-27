// structures/Btree+/buildFromData.ts

import { StationTMInterface } from "../interfaces/StationTM.interface";
import { BPlusTree } from "./Bplustree";
import { Graph } from "./Graph";
import { flattenData } from "./TransformData/CreateJson";

// Dimensiones del Canvas
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 900;
// Relleno: el mapa ocupará el 80% del canvas (1 - 2*0.1)
const PADDING_RATIO = 0.1; 

export function buildTMStructures(order = 4) {
    const rawData: StationTMInterface[] = flattenData.rawToJsonTM();

    // 1. CALCULAR LOS LÍMITES GEOGRÁFICOS REALES
    let lonMin = Infinity, lonMax = -Infinity;
    let latMin = Infinity, latMax = -Infinity;

    rawData.forEach(st => {
        // Asumiendo que st.coords es [Longitud, Latitud]
        const [lon, lat] = st.coords;
        lonMin = Math.min(lonMin, lon);
        lonMax = Math.max(lonMax, lon);
        latMin = Math.min(latMin, lat);
        latMax = Math.max(latMax, lat);
    });

    const lonRange = lonMax - lonMin;
    const latRange = latMax - latMin;
    
    // 2. CALCULAR ESCALA Y OFFSET PARA CENTRAR
    const effectiveWidth = CANVAS_WIDTH * (1 - 2 * PADDING_RATIO);
    const effectiveHeight = CANVAS_HEIGHT * (1 - 2 * PADDING_RATIO);

    // Factor de escala: Usamos el menor para mantener la relación de aspecto y que quepa
    const scaleX = effectiveWidth / lonRange;
    const scaleY = effectiveHeight / latRange;
    const scale = Math.min(scaleX, scaleY); 

    // Calcular dimensiones escaladas
    const scaledWidth = lonRange * scale;
    const scaledHeight = latRange * scale;

    // Calcular el desplazamiento (offset) para centrar el mapa
    const offsetX = (CANVAS_WIDTH - scaledWidth) / 2;
    // La coordenada Y debe empezar desde arriba y sumarle el relleno
    const offsetY = (CANVAS_HEIGHT - scaledHeight) / 2;
    
    // Inicializar estructuras
    const tree = new BPlusTree<StationTMInterface>(order);
    const graph = new Graph();

    rawData.forEach(st => {
        const [rawLon, rawLat] = st.coords;
        
        // 3. TRANSFORMAR COORDENADAS GEOGRÁFICAS A PÍXELES (X, Y)

        // X (Longitud): 
        // Se normaliza (lon - lonMin), se escala, y se desplaza al centro
        const pixelX = ((rawLon - lonMin) * scale) + offsetX;
        
        // Y (Latitud): 
        // Se debe invertir el eje Y: (latMax - rawLat) -> lo más al norte (latMax) va a Y=0
        // Se escala y se desplaza al centro
        const pixelY = ((latMax - rawLat) * scale) + offsetY;
        
        const mappedStation: StationTMInterface = {
            ...st,
            coords: [Math.round(pixelX), Math.round(pixelY)] // Coordenadas de píxeles
        };

        tree.insert(mappedStation.id, mappedStation);
        graph.addStation(mappedStation);
    });

    graph.autoConnect();

    return { tree, graph };
}