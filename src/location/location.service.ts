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

  async findOne(id: number): Promise<Location> {
    return this.locationRepository.findOneOrFail({ where: { id } });
  }

  async createLocation(data: {
    coordinate: { type: string; coordinates: [number, number] };
    location_name: string;
  }): Promise<Location> {
    const location = this.locationRepository.create({
      coordinate: data.coordinate, // 수정된 부분
      location_name: data.location_name,
    });
    await this.locationRepository.save(location);
    return location;
  }
}
