import dataTM  from "../../data/dataTm.json";
import { StationTMInterface } from "../../interfaces/StationTM.interface";
import { TmInterface } from "../../interfaces/TM.interface";
import { TransportTypes } from "../../interfaces/types.enum";

export class flattenData{

    private static rawData = dataTM as TmInterface[];

    static rawToJsonTM(): StationTMInterface[]{
        const dataToFix = this.rawData;
        let dataFixed: StationTMInterface[] = [] 
        dataToFix!.forEach(data => {
            const dataToPush: StationTMInterface = {
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
}