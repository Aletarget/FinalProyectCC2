export interface SITPInterface {
    type:       SitpInterfaceType;
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
    objectid:          number;
    cenefa:            string;
    zona_sitp:         string;
    nombre:            string;
    via:               string;
    direccion_bandera: string;
    localidad:         string;
    longitud:          number;
    latitud:           number;
    consecutivo_zona:  string;
    tipo_m_s:          TipoMS;
    consola:           string;
    panel:             string;
    audio:             string;
    zonas_nuevas:      string;
    globalid:          string;
}

export enum TipoMS {
    M = "M",
    S = "S",
}

export enum SitpInterfaceType {
    Feature = "Feature",
}
