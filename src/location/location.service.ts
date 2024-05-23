import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
  ) {}

  async createLocation(data: {
    latitude: number;
    longitude: number;
    location_name: string;
  }): Promise<Location> {
    const location = this.locationRepository.create({
      latitude: data.latitude,
      longitude: data.longitude,
      location_name: data.location_name,
    });
    await this.locationRepository.save(location);
    return location;
  }
}
