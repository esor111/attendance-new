export interface JwtPayload {
    id: string;
    kahaId: string;
    businessId?: string;
    iat?: number;
    exp?: number;
}
