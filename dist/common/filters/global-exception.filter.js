"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status;
        let message;
        let errors = [];
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const responseObj = exceptionResponse;
                message = responseObj.message || exception.message;
                errors = responseObj.errors || [];
                if (Array.isArray(responseObj.message)) {
                    message = 'Validation failed';
                    errors = responseObj.message.map((msg) => ({
                        message: msg,
                    }));
                }
            }
            else {
                message = exceptionResponse;
            }
        }
        else if (exception instanceof typeorm_1.QueryFailedError) {
            status = common_1.HttpStatus.CONFLICT;
            message = this.handleDatabaseError(exception);
        }
        else if (exception instanceof typeorm_1.EntityNotFoundError) {
            status = common_1.HttpStatus.NOT_FOUND;
            message = 'Resource not found';
        }
        else {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            this.logger.error('Unexpected error:', exception);
        }
        const errorResponse = {
            statusCode: status,
            message,
            ...(errors.length > 0 && { errors }),
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
        };
        this.logger.error(`${request.method} ${request.url} - ${status} - ${message}`, exception instanceof Error ? exception.stack : exception);
        response.status(status).json(errorResponse);
    }
    handleDatabaseError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('unique constraint') || message.includes('duplicate key')) {
            if (message.includes('email')) {
                return 'Email address is already in use';
            }
            if (message.includes('phone')) {
                return 'Phone number is already in use';
            }
            if (message.includes('kaha_id') || message.includes('kahaid')) {
                return 'KahaId is already in use';
            }
            if (message.includes('unique_department_name_per_business')) {
                return 'Department name already exists in this business';
            }
            if (message.includes('department_entity_assignments')) {
                return 'Entity is already assigned to this department';
            }
            return 'Duplicate entry detected';
        }
        if (message.includes('foreign key constraint') || message.includes('violates foreign key')) {
            if (message.includes('department')) {
                return 'Referenced department does not exist';
            }
            if (message.includes('entity')) {
                return 'Referenced entity does not exist';
            }
            return 'Referenced resource does not exist';
        }
        if (message.includes('check constraint')) {
            if (message.includes('latitude')) {
                return 'Latitude must be between -90 and 90 degrees';
            }
            if (message.includes('longitude')) {
                return 'Longitude must be between -180 and 180 degrees';
            }
            if (message.includes('radius')) {
                return 'Radius must be between 10 and 1000 meters';
            }
            return 'Data validation constraint violated';
        }
        if (message.includes('not null constraint') || message.includes('null value')) {
            return 'Required field cannot be empty';
        }
        return 'Database operation failed';
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map