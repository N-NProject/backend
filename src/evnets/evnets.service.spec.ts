import { Test, TestingModule } from '@nestjs/testing';
import { EvnetsService } from './evnets.service';

describe('EvnetsService', () => {
  let service: EvnetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvnetsService],
    }).compile();

    service = module.get<EvnetsService>(EvnetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
