import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async createLocation(data: CreateLocationDto): Promise<Location> {
    const location = this.locationRepository.create(data);
    await this.locationRepository.save(location);
    return location;
  }

  async findLocationByCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<Location | null> {
    return this.locationRepository.findOne({ where: { latitude, longitude } });
  }

  async updateLocation(location: Partial<Location>): Promise<Location> {
    const existingLocation = await this.locationRepository.findOne({
      where: { id: location.id },
    });
    if (!existingLocation) {
      throw new NotFoundException(`Location with ID ${location.id} not found`);
    }

    const updatedLocation = this.locationRepository.merge(
      existingLocation,
      location,
    );
    return this.locationRepository.save(updatedLocation);
  }
}
