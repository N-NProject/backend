import { Test, TestingModule } from '@nestjs/testing';
import { EvnetsController } from './evnets.controller';

describe('EvnetsController', () => {
  let controller: EvnetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvnetsController],
    }).compile();

    controller = module.get<EvnetsController>(EvnetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
