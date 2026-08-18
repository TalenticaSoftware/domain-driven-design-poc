import { v4 as uuidV4 } from 'uuid';
import { CreateOrderUseCase } from './CreateOrderUseCase';
import { OrderRepository } from '../domain/OrderRepository';
import { IEventBus } from '../../../shared/events/EventBus';
import { DomainError } from '../../../shared/errors/DomainError';
import { OrderCreated } from '../domain/events/OrderEvents';

describe('CreateOrderUseCase', () => {
  let orderRepository: jest.Mocked<OrderRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    orderRepository = { save: jest.fn(), findById: jest.fn() };
    eventBus = { publish: jest.fn(), subscribe: jest.fn() };
    useCase = new CreateOrderUseCase(orderRepository, eventBus);
  });

  it('creates an order, persists it, and publishes OrderCreated', async () => {
    const input = {
      customerId: uuidV4(),
      items: [{ productId: uuidV4(), quantity: 2 }],
    };

    const result = await useCase.execute(input);

    expect(result.status).toBe('CREATED');
    expect(result.orderId).toBeDefined();
    expect(orderRepository.save).toHaveBeenCalledTimes(1);
    const publishedEvents = eventBus.publish.mock.calls[0][0];
    expect(publishedEvents[0]).toBeInstanceOf(OrderCreated);
  });

  it('propagates domain error for empty items and does not persist', async () => {
    await expect(useCase.execute({ customerId: uuidV4(), items: [] })).rejects.toThrow(
      DomainError,
    );
    expect(orderRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('propagates domain error for invalid quantity', async () => {
    await expect(
      useCase.execute({ customerId: uuidV4(), items: [{ productId: uuidV4(), quantity: 0 }] }),
    ).rejects.toThrow(DomainError);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });
});
