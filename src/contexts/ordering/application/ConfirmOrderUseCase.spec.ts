import { v4 as uuidV4 } from 'uuid';
import { ConfirmOrderUseCase } from './ConfirmOrderUseCase';
import { OrderRepository } from '../domain/OrderRepository';
import { StockValidator } from './ports/StockValidator';
import { IEventBus } from '../../../shared/events/EventBus';
import { Order } from '../domain/Order';
import { OrderItem } from '../domain/OrderItem';
import { Quantity } from '../domain/value-objects/Quantity';
import { ProductId } from '../../../shared/domain/ProductId';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { OrderConfirmed, OrderRejected } from '../domain/events/OrderEvents';

const buildOrder = (): Order => {
  const order = Order.create(uuidV4(), [
    OrderItem.create(ProductId.from(uuidV4()), Quantity.from(2)),
  ]);
  order.pullDomainEvents();
  return order;
};

describe('ConfirmOrderUseCase', () => {
  let orderRepository: jest.Mocked<OrderRepository>;
  let stockValidator: jest.Mocked<StockValidator>;
  let eventBus: jest.Mocked<IEventBus>;
  let useCase: ConfirmOrderUseCase;

  beforeEach(() => {
    orderRepository = { save: jest.fn(), findById: jest.fn() };
    stockValidator = { validateAndReserve: jest.fn() };
    eventBus = { publish: jest.fn(), subscribe: jest.fn() };
    useCase = new ConfirmOrderUseCase(orderRepository, stockValidator, eventBus);
  });

  it('confirms the order when stock is available and publishes OrderConfirmed', async () => {
    const order = buildOrder();
    orderRepository.findById.mockResolvedValue(order);
    stockValidator.validateAndReserve.mockResolvedValue({
      isAvailable: true,
      unavailableProductIds: [],
    });

    const result = await useCase.execute(order.id.value);

    expect(result.status).toBe('CONFIRMED');
    expect(orderRepository.save).toHaveBeenCalledTimes(1);
    const publishedEvents = eventBus.publish.mock.calls[0][0];
    expect(publishedEvents[0]).toBeInstanceOf(OrderConfirmed);
  });

  it('rejects the order when stock is insufficient and publishes OrderRejected', async () => {
    const order = buildOrder();
    const unavailableId = uuidV4();
    orderRepository.findById.mockResolvedValue(order);
    stockValidator.validateAndReserve.mockResolvedValue({
      isAvailable: false,
      unavailableProductIds: [unavailableId],
    });

    const result = await useCase.execute(order.id.value);

    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toContain(unavailableId);
    const publishedEvents = eventBus.publish.mock.calls[0][0];
    expect(publishedEvents[0]).toBeInstanceOf(OrderRejected);
  });

  it('throws 404 when the order does not exist', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(uuidV4())).rejects.toThrow(CustomHttpException);
    expect(stockValidator.validateAndReserve).not.toHaveBeenCalled();
  });

  it('fails when confirming an already confirmed order', async () => {
    const order = buildOrder();
    order.confirm();
    order.pullDomainEvents();
    orderRepository.findById.mockResolvedValue(order);
    stockValidator.validateAndReserve.mockResolvedValue({
      isAvailable: true,
      unavailableProductIds: [],
    });

    await expect(useCase.execute(order.id.value)).rejects.toThrow(
      'Invalid order status transition',
    );
  });
});
