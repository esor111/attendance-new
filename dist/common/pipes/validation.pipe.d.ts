import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class EnhancedValidationPipe implements PipeTransform<any> {
    transform(value: any, { metatype }: ArgumentMetadata): Promise<any>;
    private toValidate;
}
export declare class CoordinateValidationPipe implements PipeTransform {
    transform(value: any): any;
}
