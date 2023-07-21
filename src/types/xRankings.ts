export enum Mode {
    Area = 'xRankingAr',
    Rainmaker = 'xRankingGl',
    Clam = 'xRankingCl',
    Tower = 'xRankingLf',
}

export interface DetailTabViewXRankingRefetchQuery {
    data: Data;
}

interface XRanking {
    edges: Edge[];
    pageInfo: PageInfo;
}

type Node = {
    [key in Mode]?: XRanking;
};

interface _Node {
    id: string;
    __typename: string;
}

interface Data {
    node: Node & _Node;
}

export interface Edge {
    node: Node2;
    cursor: string;
}

export interface Node2 {
    id: string;
    name: string;
    nameId: string;
    rank: number;
    rankDiff?: string;
    xPower: number;
    weapon: Weapon;
    weaponTop: boolean;
    __isPlayer: string;
    byname: string;
    nameplate: Nameplate;
    __typename: string;
}

export interface Weapon {
    name: string;
    image: Image;
    id: string;
    image3d: Image3d;
    image2d: Image2d;
    image3dThumbnail: Image3dThumbnail;
    image2dThumbnail: Image2dThumbnail;
    subWeapon: SubWeapon;
    specialWeapon: SpecialWeapon;
}

export interface Image {
    url: string;
}

export interface Image3d {
    url: string;
}

export interface Image2d {
    url: string;
}

export interface Image3dThumbnail {
    url: string;
}

export interface Image2dThumbnail {
    url: string;
}

export interface SubWeapon {
    name: string;
    image: Image2;
    id: string;
}

export interface Image2 {
    url: string;
}

export interface SpecialWeapon {
    name: string;
    image: Image3;
    id: string;
}

export interface Image3 {
    url: string;
}

export interface Nameplate {
    badges: Badge | undefined[];
    background: Background;
}

export interface Badge {
    image: Image4;
    id: string;
}

export interface Image4 {
    url: string;
}

export interface Background {
    textColor: TextColor;
    image: Image5;
    id: string;
}

export interface TextColor {
    a: number;
    b: number;
    g: number;
    r: number;
}

export interface Image5 {
    url: string;
}

export interface PageInfo {
    endCursor: string;
    hasNextPage: boolean;
}
