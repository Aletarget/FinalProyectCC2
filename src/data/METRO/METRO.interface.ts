export interface METROInterface {
    type:       METROInterfaceType;
    properties: Properties;
    geometry:   Geometry;
}

export interface Geometry {
    type:        GeometryType;
    coordinates: number[];
}

export enum GeometryType {
    Point = "Point",
}

export interface Properties {
    objectid: number;
    nombre:   string;
    linea:    Linea;
    tipo:     Tipo;
    troncal:  Troncal;
}

export enum Linea {
    Línea1 = "Línea 1",
}

export enum Tipo {
    Metro = "METRO",
}

export enum Troncal {
    MetroL1 = "Metro L1",
}

export enum METROInterfaceType {
    Feature = "Feature",
}
