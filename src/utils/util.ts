export function ReduceCacheExpiration(
    expiresIn: number,
    second: number = 5 * 60
) {
    return expiresIn - second;
}
