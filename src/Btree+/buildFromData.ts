// structures/Btree+/buildFromData.ts

import { StationInterface } from "../interfaces/Stations.interface";
import { BPlusTree } from "./Bplustree";
import { Graph } from "./Graph";
import { flattenData } from "./TransformData/CreateJson";

const CANVAS_WIDTH = 1250;
const CANVAS_HEIGHT = 900;
const PADDING_RATIO = 0.04;

export class BuildTMStructures {
  
    // El método ahora recibe el 'order' directamente
    public static buildTMStructures(order = 4) {
        //CAMBIO CRÍTICO: Usar rawToJsonAll() para incluir estaciones TM y SITP
        const rawData: StationInterface[] = flattenData.rawToJsonAll();
        
        // 1. CALCULAR LOS LÍMITES GEOGRÁFICOS REALES
        let lonMin = Infinity, lonMax = -Infinity;
        let latMin = Infinity, latMax = -Infinity;

        rawData.forEach(st => {
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

        // Factor de escala: Usamos el menor para mantener la relación de aspecto
        const scaleX = effectiveWidth / lonRange;
        const scaleY = effectiveHeight / latRange;
        const scale = Math.min(scaleX, scaleY); 

        // Calcular dimensiones escaladas
        const scaledWidth = lonRange * scale;
        const scaledHeight = latRange * scale;

        // Calcular el desplazamiento (offset) para centrar el mapa
        const offsetX = (CANVAS_WIDTH - scaledWidth) / 2;
        const offsetY = (CANVAS_HEIGHT - scaledHeight) / 2;
        
        // Inicializar estructuras
        const tree = new BPlusTree<StationInterface>(order);
        const graph = new Graph();

        rawData.forEach(st => {
        const [rawLon, rawLat] = st.coords;
        
        // 3. TRANSFORMAR COORDENADAS GEOGRÁFICAS A PÍXELES (X, Y)
        const pixelX = ((rawLon - lonMin) * scale) + offsetX;
        const pixelY = ((latMax - rawLat) * scale) + offsetY; // Inversión del eje Y
        
        const mappedStation: StationInterface = {
            ...st,
            coords: [Math.round(pixelX), Math.round(pixelY)]
        };

        tree.insert(mappedStation.id, mappedStation);
        graph.addStation(mappedStation);
        });

        graph.autoConnect();
        this.connectManually(graph); // Llamada al método estático

        return { tree, graph };
    }

    private static connectManually(graph: Graph){
        //Conexiones entre distintas troncales
        console.log("--- Aplicando Conexiones Manuales ---");

        // A. Transbordos Internos (Mismo nombre, diferente troncal)
        graph.connectInternalTransfer("Ricaurte");    // Ricaurte (F) <-> Ricaurte (NQS)
        graph.connectInternalTransfer("Avenida Jiménez"); // Av Jimenez (Caracas) <-> Av Jimenez (Calle 13)
        graph.connectInternalTransfer("San Victorino");   // Por seguridad, si hay varias plataformas

        // B. Conexiones NQS Central (Corrigiendo el hueco de la 30)
        graph.connectByName("Comuneros", "Ricaurte");
        graph.connectByName("Ricaurte", "Guatoque"); // Guatoque - Veraguas

        // C. Conexiones Eje Ambiental / Centro
        graph.connectByName("Tygua", "San Victorino");     // Tygua - San José <-> San Victorino
        graph.connectByName("Bicentenario", "San Victorino");
        graph.connectByName("Av Jiménez", "Las Nieves");
        graph.connectByName("Av Jiménez", "Museo del Oro");
        graph.connectByName("Avenida Jiménez", "Av Jiménez");
        graph.connectByName("San Victorino", "Las Nieves");
        graph.connectByName("Aguas", "Museo del Oro");     // Aguas <-> Museo del Oro
        
        // Basta con una: Av Jiménez (general) se conecta a Calle 19.
        graph.connectByName("Avenida Jiménez", "Calle 19");

        // D. Intercambiador Calle 76 / Héroes / Polo (El triángulo del Norte)
        graph.connectByName("Polo", "Calle 76");       // Polo <-> Calle 76
        graph.connectByName("Polo", "Héroes");
        graph.connectByName("Calle 76", "Héroes");       // Refuerzo directo

        // E. Otras conexiones Norte / NQS
        graph.connectByName("NQS - Calle 75", "San Martín"); // Zona M <-> San Martín
        graph.connectByName("Castellana", "Calle 100");    // La Castellana <-> Calle 100 - Marketmedios
        
        // F. Universidad Nacional
        graph.connectByName("Ciudad Universitaria", "Universidad Nacional");

        // G. Calle 13 con caracas (Conexiones de la Estación Sabana)
        graph.connectByName('De la sabana', 'Calle 19');
        graph.connectByName('De la sabana', 'Avenida Jiménez'); 

    }
}