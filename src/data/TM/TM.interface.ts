export interface TmInterface {
    fid:              number;
    nombre_estacion:  string;
    troncal_estacion: TroncalEstacion;
    coord_x:          number;
    coord_y:          number;
    geopoint:         Geopoint;
}

export interface Geopoint {
    lon: number;
    lat: number;
}

export enum TroncalEstacion {
    A = "A",
    B = "B",
    C = "C",
    D = "D",
    E = "E",
    F = "F",
    G = "G",
    H = "H",
    J = "J",
    K = "K",
    L = "L",
}
