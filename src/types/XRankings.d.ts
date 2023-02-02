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

export interface xRankingPlayerData {
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
    node: xRankingPlayerData;
    cursor: string;
}

interface PageInfo {
    endCursor: string;
    hasNextPage: boolean;
}

interface XRankingAr {
    edges: Edge[];
    pageInfo: PageInfo;
}

interface Node {
    __typename: string;
    xRankingAr: XRankingAr;
    id: string;
}

interface Data {
    node: Node;
}

export interface DetailTabViewXRankingArRefetchQuery {
    data: Data;
}
