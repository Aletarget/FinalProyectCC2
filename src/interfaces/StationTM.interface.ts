import { TransportTypes } from "./types.enum";

export interface StationTMInterface{
    id: number,
    name: string,
    coords: [number,number],
    type: TransportTypes;
    troncal?: string;
}