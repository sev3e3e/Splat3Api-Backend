export function ReduceCacheExpiration(expiresIn: number) {
    return expiresIn - 5 * 60;
}
