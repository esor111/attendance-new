import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';
import { Entity } from './entities/entity.entity';

/**
 * Entity Module - Handles business location management with geospatial functionality
 * Integrates PostGIS for location-based operations and proximity searches
 */
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [EntityController],
  providers: [EntityService],
  exports: [EntityService], // Export for use in other modules
})
export class EntityModule {}