import { Test, TestingModule } from '@nestjs/testing';
import { ChatRoomService } from './chat-room.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { Message } from '../message/entities/message.entity';
import { UserChatRoom } from '../user-chat-room/entities/user-chat-room.entity';
import { BoardService } from '../board/board.service';
import { EventsGateway } from '../events/events.gateway';
import { SseService } from '../sse/sse.service';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('ChatRoomService', () => {
  let service: ChatRoomService;
  let chatRoomRepository: Repository<ChatRoom>;
  let userRepository: Repository<User>;
  let messageRepository: Repository<Message>;
  let userChatRoomRepository: Repository<UserChatRoom>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRoomService,
        {
          provide: getRepositoryToken(ChatRoom),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Message),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UserChatRoom),
          useClass: Repository,
        },
        { provide: BoardService, useValue: {} },
        { provide: EventsGateway, useValue: { broadcastMessage: jest.fn() } },
        {
          provide: SseService,
          useValue: {
            notifyMemberCountChange: jest.fn(),
            getRoomUpdatesObservable: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatRoomService>(ChatRoomService);
    chatRoomRepository = module.get<Repository<ChatRoom>>(
      getRepositoryToken(ChatRoom),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    messageRepository = module.get<Repository<Message>>(
      getRepositoryToken(Message),
    );
    userChatRoomRepository = module.get<Repository<UserChatRoom>>(
      getRepositoryToken(UserChatRoom),
    );

    jest
      .spyOn(userRepository, 'findOne')
      .mockImplementation(async (options) => {
        if (Array.isArray(options) || !('where' in options)) {
          return null;
        }
        return { id: (options.where as any).id, username: 'TestUser' } as User;
      });

    jest
      .spyOn(userChatRoomRepository, 'create')
      .mockImplementation((entity) => {
        return { ...entity, id: entity.id ?? 1 } as UserChatRoom;
      });
    jest
      .spyOn(userChatRoomRepository, 'save')
      .mockImplementation(async (entity) => {
        return { ...entity } as UserChatRoom;
      });
    jest
      .spyOn(chatRoomRepository, 'save')
      .mockImplementation(async (entity) => {
        return { ...entity } as ChatRoom;
      });
  });

  describe('getChatRoom', () => {
    it('채팅방이 존재하는 경우 해당 채팅방을 반환해야 합니다', async () => {
      const chatRoom = { id: 1, messages: [], board: {} } as ChatRoom;
      jest.spyOn(chatRoomRepository, 'findOne').mockResolvedValue(chatRoom);

      const result = await service.getChatRoom(1);
      expect(result).toEqual(chatRoom);
    });

    it('채팅방이 존재하지 않는 경우 NotFoundException을 던져야 합니다', async () => {
      jest.spyOn(chatRoomRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getChatRoom(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinChatRoomByBoardId', () => {
    it('userId가 제공되지 않은 경우 UnauthorizedException을 던져야 합니다', async () => {
      await expect(service.joinChatRoomByBoardId(1, null)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('채팅방이 존재하지 않는 경우 NotFoundException을 던져야 합니다', async () => {
      jest.spyOn(service, 'findChatRoomByBoardId').mockResolvedValue(null);

      await expect(service.joinChatRoomByBoardId(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('채팅방에 참가할 때 멤버 수가 증가해야 합니다', async () => {
      const chatRoom = {
        id: 1,
        member_count: 1,
        max_member_count: 5,
        userChatRooms: [],
      } as ChatRoom;
      jest.spyOn(service, 'findChatRoomByBoardId').mockResolvedValue(chatRoom);

      await service.joinChatRoomByBoardId(1, 1);
      expect(chatRoomRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ member_count: 2 }),
      );
      expect(userChatRoomRepository.save).toHaveBeenCalled();
    });

    it('채팅방 최대 인원을 초과할 수 없습니다', async () => {
      const chatRoom = {
        id: 1,
        member_count: 5,
        max_member_count: 5,
        userChatRooms: [],
      } as ChatRoom;
      jest.spyOn(service, 'findChatRoomByBoardId').mockResolvedValue(chatRoom);

      await expect(service.joinChatRoomByBoardId(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('이미 채팅방에 들어가 있는 경우 ConflictException을 던져야 합니다', async () => {
      const chatRoom = {
        id: 1,
        member_count: 1,
        max_member_count: 5,
        userChatRooms: [{ user: { id: 1 } }],
      } as ChatRoom;
      jest.spyOn(service, 'findChatRoomByBoardId').mockResolvedValue(chatRoom);

      await expect(service.joinChatRoomByBoardId(1, 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('leaveChatRoomByBoardId', () => {
    it('채팅방에서 나갈 때 멤버 수가 감소해야 합니다', async () => {
      const chatRoom = {
        id: 1,
        member_count: 2,
        userChatRooms: [{ user: { id: 1 } }],
      } as ChatRoom;
      jest.spyOn(chatRoomRepository, 'findOne').mockResolvedValue(chatRoom);
      jest
        .spyOn(userChatRoomRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);

      await service.leaveChatRoomByBoardId(1, 1);
      expect(chatRoomRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ member_count: 1 }),
      );
    });

    it('채팅방이 존재하지 않는 경우 NotFoundException을 던져야 합니다', async () => {
      jest.spyOn(chatRoomRepository, 'findOne').mockResolvedValue(null);

      await expect(service.leaveChatRoomByBoardId(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('sendMessage', () => {
    it('채팅방이 존재하지 않는 경우 NotFoundException을 던져야 합니다', async () => {
      jest.spyOn(chatRoomRepository, 'findOne').mockResolvedValue(null);

      await expect(service.sendMessage(1, 1, 'Hello', 'User')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('메시지를 저장하고 이를 브로드캐스트해야 합니다', async () => {
      const chatRoom = { id: 1 } as ChatRoom;
      const user = { id: 1 } as User;
      const message = {
        content: 'Hello',
        nickname: 'User',
        chatRoom,
        user,
      } as Message;

      jest.spyOn(chatRoomRepository, 'findOne').mockResolvedValue(chatRoom);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(messageRepository, 'create').mockReturnValue(message);
      jest.spyOn(messageRepository, 'save').mockResolvedValue(message);

      const result = await service.sendMessage(1, 1, 'Hello', 'User');
      expect(result).toEqual(message);
      expect(service['eventsGateway'].broadcastMessage).toHaveBeenCalledWith(
        'broadcastMessage',
        {
          chatRoomId: 1,
          message: 'Hello',
          nickName: 'User',
        },
      );
    });
  });
});
