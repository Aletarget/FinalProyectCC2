import dataSitp from "../data/dataSitp.json" assert { type: "json" };
import dataTM  from "../data/dataTm.json" assert {type: "json"};
import { InterfaceSITP } from "../interfaces/dataSITP.interface";
import { InterfaceTM } from "../interfaces/dataTm.interface";
import { LinksInterface } from "../interfaces/links.interfaces";
import { TransportTypes } from "../interfaces/types.enum";

export class CreateJson{

    private static initialSitpData = dataSitp;
    private static initialTMData = dataTM;

    static dataToJsonTM(): InterfaceTM[]{
        const dataToFix = this.initialTMData;
        let dataFixed: InterfaceTM[] = [] 
        dataToFix!.forEach(data => {
            const dataToPush: InterfaceTM = {
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


    static dataToJsonSITP(): InterfaceSITP[]{
            const dataToFix = this.initialSitpData
            let dataFixed: InterfaceSITP[] = [] 
            dataToFix.forEach(data => {
                const dataToPush: InterfaceSITP = {
                    coords: [data.properties.longitud, data.properties.latitud],
                    id: data.properties.objectid,
                    name: data.properties.nombre!,
                    type: TransportTypes.sitp
                }
                dataFixed.push(dataToPush);
            })
            return dataFixed
        }


    static linksdataJsonTM(){
        const dataFixedTM = this.dataToJsonTM()
        let links: LinksInterface[] = []
        const ordenadasPorId = dataFixedTM.sort((a,b) => a.id - b.id);
        for (let i = 0; i < ordenadasPorId.length - 1 ; i++) {

            links.push({
                source: ordenadasPorId[i].id,
                target: ordenadasPorId[i+1].id
            })
        }
        
        return links;

    }
    static linksdataJsonSITP(){
            const dataFixedTM = this.dataToJsonSITP()
            let links: LinksInterface[] = []
            for (let i = 0; i < dataFixedTM.length - 1 ; i++) {

                links.push({
                    source: dataFixedTM[i].id,
                    target: dataFixedTM[i+1].id
                })
            }
            
            return links;

        }

}