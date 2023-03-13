interface Image {
    url: string;
}

interface Image3d {
    url: string;
}

interface Image2d {
    url: string;
}

interface Image3dThumbnail {
    url: string;
}

interface Image2dThumbnail {
    url: string;
}

interface Image2 {
    url: string;
}

interface SubWeapon {
    name: string;
    image: Image2;
    id: string;
}

interface Image3 {
    url: string;
}

interface SpecialWeapon {
    name: string;
    image: Image3;
    id: string;
}

interface Weapon {
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

interface Image4 {
    url: string;
}

interface Badge {
    image: Image4;
    id: string;
}

interface TextColor {
    a: number;
    b: number;
    g: number;
    r: number;
}

interface Image5 {
    url: string;
}

interface Background {
    textColor: TextColor;
    image: Image5;
    id: string;
}

interface Nameplate {
    badges: Badge[];
    background: Background;
}

export interface XRankingPlayerDataRaw {
    id: string;
    name: string;
    rank: number;
    rankDiff?: any;
    xPower: number;
    weapon: Weapon;
    weaponTop: boolean;
    __isPlayer: string;
    byname: string;
    nameId: string;
    nameplate: Nameplate;
    __typename: string;
}

interface Edge {
    node: XRankingPlayerDataRaw;
    cursor: string;
}

interface PageInfo {
    endCursor: string;
    hasNextPage: boolean;
}

interface XRanking {
    edges: Edge[];
    pageInfo: PageInfo;
}

export enum Mode {
    Area = 'xRankingAr',
    Rainmaker = 'xRankingGl',
    Clam = 'xRankingCl',
    Tower = 'xRankingLf',
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

export interface DetailTabViewXRankingRefetchQuery {
    data: Data;
}
