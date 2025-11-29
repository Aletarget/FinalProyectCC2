import dataTM  from "../../data/dataTm.json";
import dataSitp from "../../data/dataSitp.json";
import { SITPInterface } from "../../interfaces/SITP.interface";
import { StationInterface } from "../../interfaces/Stations.interface";
import { TmInterface } from "../../interfaces/TM.interface";
import { TransportTypes } from "../../interfaces/types.enum";

export class flattenData{

    private static rawData = dataTM as TmInterface[];
    private static rawDataSitp = dataSitp as SITPInterface[];

    static rawToJsonTM(): StationInterface[]{
        const dataToFix = this.rawData;
        let dataFixed: StationInterface[] = [] 
        dataToFix!.forEach(data => {
            const dataToPush: StationInterface = {
                coords: [data.coord_x, data.coord_y],
                id: data.fid,
                name: data.nombre_estacion,
                type: TransportTypes.transM,
                troncal: data.troncal_estacion
            }
            dataFixed.push(dataToPush);
        });
        return dataFixed
    }

    public static rawToJsonAll(): StationInterface[] {
        const tmStations: StationInterface[] = this.rawToJsonTM();
        let currentId = 5000; // ID inicial para el SITP (asegura que no choquen con las de TM)

        const sitpStations: StationInterface[] = this.rawDataSitp.map(data => {
        const properties = data.properties;
        const coordinates = [properties.longitud, properties.latitud]; // [Longitud, Latitud]

        return {
            coords: [coordinates[0], coordinates[1]], 
            id: currentId++, // Usar un ID incremental único
            name: properties.nombre, // El nombre de la estación SITP
            type: TransportTypes.sitp, // Asignar el tipo de transporte correcto
            lineName: properties.zona_sitp 
        } as StationInterface;
        });
        
        return [...tmStations, ...sitpStations /*, ...metroStations*/];
    }
}