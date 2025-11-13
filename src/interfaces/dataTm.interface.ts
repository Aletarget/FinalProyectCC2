import { TransportTypes } from "./types.enum";

export interface InterfaceTM{
    id: number,
    name: string,
    coords: [number,number],
    type: TransportTypes;
    troncal?: string;
}