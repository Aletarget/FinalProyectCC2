export interface DataCompleteSitp {
    type:       DataCompleteSitpType;
    properties: Properties;
    geometry:   Geometry | null;
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
    nombre:            null | string;
    via:               string;
    direccion_bandera: string;
    localidad:         Localidad;
    longitud:          number;
    latitud:           number;
    consecutivo_zona:  string;
    tipo_m_s:          TipoMS | null;
    consola:           null | string;
    panel:             null | string;
    audio:             string;
    zonas_nuevas:      null | string;
    globalid:          string;
    shape?:            null;
}

export enum Localidad {
    AntonioNariño = "Antonio Nariño",
    BarriosUnidos = "Barrios Unidos",
    Bosa = "Bosa",
    Candelaria = "Candelaria",
    Chapinero = "Chapinero",
    CiudadBolívar = "Ciudad Bolívar",
    Engativá = "Engativá",
    Fontibón = "Fontibón",
    Kennedy = "Kennedy",
    LosMártires = "Los Mártires",
    PuenteAranda = "Puente Aranda",
    RafaelUribe = "Rafael Uribe",
    SANCristóbal = "San Cristóbal",
    SantaFe = "Santa Fe",
    Suba = "Suba",
    Teusaquillo = "Teusaquillo",
    Tunjuelito = "Tunjuelito",
    Usaquén = "Usaquén",
    Usme = "Usme",
}

export enum TipoMS {
    M = "M",
    S = "S",
}

export enum DataCompleteSitpType {
    Feature = "Feature",
}
