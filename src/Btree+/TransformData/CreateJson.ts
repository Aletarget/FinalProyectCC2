import dataTM  from "../../data/TM/dataTm.json";
import dataSitp from "../../data/SITP/dataSitp.json";
import dataMetro from "../../data/METRO/dataMetro.json";
import { SITPInterface } from "../../data/SITP/SITP.interface";
import { StationInterface } from "../../interfaces/Stations.interface";
import { TmInterface } from "../../data/TM/TM.interface";
import { TransportTypes } from "../../interfaces/types.enum";
import { METROInterface } from "../../data/METRO/METRO.interface";

export class flattenData{

    private static rawDataTM = dataTM as TmInterface[];
    private static rawDataSitp = dataSitp as SITPInterface[];
    private static rawDataMetro = dataMetro as METROInterface[];

    private static rawToJsonTM(): StationInterface[]{
        const dataToFix = this.rawDataTM;
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

    private static rawToJsonMetro(): StationInterface[]{
        const dataToFix = this.rawDataMetro;
        let currentId = 20000
        let dataFixed: StationInterface[] = [];
        dataToFix.forEach(data => {
            const dataToPush: StationInterface = {
                coords: [Number(data.geometry.coordinates[0]), Number(data.geometry.coordinates[1])],
                id: currentId,
                name: data.properties.nombre,
                type: TransportTypes.metro,
                lineName: data.properties.linea,
            }
            currentId += 1;
            dataFixed.push(dataToPush);
        })
        return dataFixed;

    }

    public static rawToJsonAll(): StationInterface[] {
        const tmStations: StationInterface[] = this.rawToJsonTM();
        const metroStations: StationInterface[] = this.rawToJsonMetro();
        let currentId = 5000; // ID inicial para el SITP (asegura que no choquen con las de TM)

        const sitpStations: StationInterface[] = this.rawDataSitp.map(data => {
        const properties = data.attributes;
        const coordinates = [data.geometry.x, data.geometry.y]; // [Longitud, Latitud]

        return {
            coords: [coordinates[0], coordinates[1]], 
            id: currentId++, // Usar un ID incremental único
            name: properties.nombre_par, // El nombre de la estación SITP
            type: TransportTypes.sitp, // Asignar el tipo de transporte correcto
            lineName: String(properties.zona_parad) 
        } as StationInterface;
        });
        
        return [...tmStations, ...sitpStations  ,...metroStations];
    }
}