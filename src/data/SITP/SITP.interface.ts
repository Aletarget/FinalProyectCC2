export interface SITPInterface {
    attributes: Attributes;
    geometry:   Geometry;
}

export interface Attributes {
    FID:        number;
    objectid:   number;
    cenefa_par: string;
    mdoulo_par: string;
    zona_parad: number;
    nombre_par: string;
    via_parade: string;
    direccion_: string;
    localidad_: number;
    consola_pa: string;
    panel_para: string;
    audio_para: string;
    longitud_p: number;
    latitud_pa: number;
    coordenada: number;
    coordena_1: number;
    globalid:   string;
}

export interface Geometry {
    x: number;
    y: number;
}
