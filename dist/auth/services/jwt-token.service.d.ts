import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
export declare class JwtTokenService {
    private readonly jwtService;
    private readonly configService;
    constructor(jwtService: JwtService, configService: ConfigService);
    verifyToken(token: string): JwtPayload;
    hasBusinessContext(payload: JwtPayload): boolean;
}
