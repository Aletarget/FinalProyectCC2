// structures/Btree+/buildFromData.ts

import { RouteInterface } from "../interfaces/Routes.interface";
import { StationInterface } from "../interfaces/Stations.interface";
import { constsWeights } from "../interfaces/weights.enum";
import { BPlusTree } from "./Bplustree";
import { Graph } from "./Graph";
import { CalculateAdjListWithWeights } from "./TransformData/calculateWeigths";
import { flattenData } from "./TransformData/CreateJson";

const CANVAS_WIDTH = 1250;
const CANVAS_HEIGHT = 900;
const PADDING_RATIO = 0.04;

export class BuildStructures {
  
    // El método ahora recibe el 'order' directamente
  public static buildStructures(order = 4) {
        const rawData: StationInterface[] = flattenData.rawToJsonAllStations();
        const routes: RouteInterface[] = flattenData.getRoutes();
        
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
        
        // 2. CALCULAR ESCALA Y OFFSET
        const effectiveWidth = CANVAS_WIDTH * (1 - 2 * PADDING_RATIO);
        const effectiveHeight = CANVAS_HEIGHT * (1 - 2 * PADDING_RATIO);

        // Factor de escala (se usa el menor para mantener la relación de aspecto)
        const scaleX = effectiveWidth / lonRange;
        const scaleY = effectiveHeight / latRange;
        const scale = Math.min(scaleX, scaleY); 

        const maxRealDistanceMeters = lonRange * constsWeights.COORD_TO_METERS;
        const scaledWidth = lonRange * scale;
        
        // PIXEL_TO_METER_RATIO = (Distancia real en Metros) / (Distancia mapeada en Píxeles)
        const PIXEL_TO_METER_RATIO = maxRealDistanceMeters / scaledWidth;
        console.log(`Factor Píxel a Metro: ${PIXEL_TO_METER_RATIO.toFixed(4)} metros/píxel`);


        // Calcular el desplazamiento (offset) para centrar el mapa
        const scaledHeight = latRange * scale;
        const offsetX = (CANVAS_WIDTH - scaledWidth) / 2;
        const offsetY = (CANVAS_HEIGHT - scaledHeight) / 2;
        
        // Inicializar estructuras
        const tree = new BPlusTree<number ,StationInterface>(order);
        const routesTree = new BPlusTree<string, RouteInterface>(order);
        const graph = new Graph();
        

        rawData.forEach(st => {
        const [rawLon, rawLat] = st.coords;
        
        // 3. TRANSFORMAR COORDENADAS GEOGRÁFICAS A PÍXELES (X, Y)
        const pixelX = ((rawLon - lonMin) * scale) + offsetX;
        const pixelY = ((latMax - rawLat) * scale) + offsetY; // Inversión del eje Y
        
        const mappedStation: StationInterface = {
                    ...st,
                    coords: [Math.round(pixelX), Math.round(pixelY)] // Coordenadas en PÍXELES
        };

        tree.insert(mappedStation.id, mappedStation);
        graph.addStation(mappedStation);
        });

        // Llenar arbol de rutas
        routes.forEach((route)=>{
                    const routeKey = route.routeId;
                    routesTree.insert(routeKey, route)
        })

        // 4. CREAR CONEXIONES (usando peso TEMPORAL 1 en el grafo)
        graph.autoConnect();
        graph.autoConnectSITP(); 

        this.connectManually(graph); 

        // 5. APLICAR PESOS REALES
        const weightCalculator = new CalculateAdjListWithWeights();
        // Pasamos el factor de escala para que la clase de pesos pueda calcular distancias reales.
        weightCalculator.applyWeightsToGraph(graph, PIXEL_TO_METER_RATIO); 
        weightCalculator.reAsignWeights(graph.adjList, graph.adjListComplete);
            return { tree, graph, routesTree };
        }
        

    private static connectManually(graph: Graph){
        //Conexiones entre distintas troncales
        console.log("--- Aplicando Conexiones Manuales ---");

        // A. Transbordos Internos (Mismo nombre, diferente troncal)
        graph.connectInternalTransfer("Ricaurte");    // Ricaurte (F) <-> Ricaurte (NQS)
        graph.connectInternalTransfer("Avenida Jiménez"); // Av Jimenez (Caracas) <-> Av Jimenez (Calle 13)
        graph.connectInternalTransfer("San Victorino");       // Por seguridad, si hay varias plataformas

        // B. Conexiones NQS Central (Corrigiendo el hueco de la 30)
        graph.connectByName("Comuneros", "Ricaurte");
        graph.connectByName("Ricaurte", "Guatoque"); // Guatoque - Veraguas

        // C. Conexiones Eje Ambiental / Centro
        graph.connectByName("Tygua", "San Victorino");         // Tygua - San José <-> San Victorino
        graph.connectByName("Bicentenario", "San Victorino");
        graph.connectByName("Av Jiménez", "Las Nieves");
        graph.connectByName("Av Jiménez", "Museo del Oro");
        graph.connectByName("Avenida Jiménez", "Av Jiménez");
        graph.connectByName("Av Jiménez", "De la Sabana");
        graph.connectByName("San Victorino", "Las Nieves");
        graph.connectByName("Aguas", "Museo del Oro");         // Aguas <-> Museo del Oro

        // Basta con una: Av Jiménez (general) se conecta a Calle 19.
        graph.connectByName("Avenida Jiménez", "Calle 19");

        // D. Intercambiador Calle 76 / Héroes / Polo (El triángulo del Norte)
        graph.connectByName("Polo", "Calle 76");       // Polo <-> Calle 76
        graph.connectByName("Polo", "Héroes");
        graph.connectByName("Calle 76", "Héroes");           // Refuerzo directo

        // E. Otras conexiones Norte / NQS
        graph.connectByName("NQS - Calle 75", "San Martín"); // Zona M <-> San Martín
        graph.connectByName("Castellana", "Calle 100");    // La Castellana <-> Calle 100 - Marketmedios
        
        // F. Universidad Nacional
        graph.connectByName("Ciudad Universitaria", "Universidad Nacional");

        // G. Calle 13 con caracas (Conexiones de la Estación Sabana)
        graph.connectByName('De la sabana', 'Calle 19');
        graph.connectByName('De la sabana', 'Avenida Jiménez'); 



        // Transbordos de Metro con transmilenio
        graph.connect(62,20012);
        graph.connect(149,20011);
        graph.connect(138, 20009);


        // Transbordos de Sitp con transmilenio
        graph.connect(102, 5019);
        graph.connect(104, 5019);

        graph.connect(123, 5024);
        graph.connect(125, 5024);

        // Conectar estaciones de sitp con sipt
        graph.connect(5001, 5016);
        graph.connect(5004, 5006);
        graph.connect(5009, 5002);
        graph.connect(5018, 5012);


    }
}