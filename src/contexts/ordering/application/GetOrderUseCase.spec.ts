import { v4 as uuidV4 } from 'uuid';
import { GetOrderUseCase } from './GetOrderUseCase';
import { OrderEventHandlers } from './OrderEventHandlers';
import { OrderRepository } from '../domain/OrderRepository';
import { Order } from '../domain/Order';
import { OrderItem } from '../domain/OrderItem';
import { Quantity } from '../domain/value-objects/Quantity';
import { ProductId } from '../../../shared/domain/ProductId';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import {
  ShipmentScheduled,
  DeliveryCompleted,
} from '../../shipping/domain/events/ShipmentEvents';
import { OrderStatusValue } from '../domain/value-objects/OrderStatus';

const buildOrder = (): Order => {
  const order = Order.create(uuidV4(), [
    OrderItem.create(ProductId.from(uuidV4()), Quantity.from(3)),
  ]);
  order.pullDomainEvents();
  return order;
};

describe('GetOrderUseCase', () => {
  let orderRepository: jest.Mocked<OrderRepository>;
  let useCase: GetOrderUseCase;

  beforeEach(() => {
    orderRepository = { save: jest.fn(), findById: jest.fn() };
    useCase = new GetOrderUseCase(orderRepository);
  });

  it('returns order details with items', async () => {
    const order = buildOrder();
    orderRepository.findById.mockResolvedValue(order);

    const result = await useCase.execute(order.id.value);

    expect(result.orderId).toBe(order.id.value);
    expect(result.status).toBe('CREATED');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(3);
  });

  it('throws 404 when the order does not exist', async () => {
    orderRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute(uuidV4())).rejects.toThrow(CustomHttpException);
  });
});

describe('OrderEventHandlers', () => {
  let orderRepository: jest.Mocked<OrderRepository>;
  let handlers: OrderEventHandlers;

  beforeEach(() => {
    orderRepository = { save: jest.fn(), findById: jest.fn() };
    handlers = new OrderEventHandlers(orderRepository);
  });

  it('marks the order shipped when its shipment is scheduled', async () => {
    const order = buildOrder();
    order.confirm();
    order.pullDomainEvents();
    orderRepository.findById.mockResolvedValue(order);

    await handlers.onShipmentScheduled(
      new ShipmentScheduled(uuidV4(), order.id.value, new Date(), 'SwiftShip Logistics'),
    );

    expect(order.status.is(OrderStatusValue.SHIPPED)).toBe(true);
    expect(orderRepository.save).toHaveBeenCalledWith(order);
  });

  it('marks the order delivered when delivery completes', async () => {
    const order = buildOrder();
    order.confirm();
    order.markShipped();
    orderRepository.findById.mockResolvedValue(order);

    await handlers.onDeliveryCompleted(new DeliveryCompleted(uuidV4(), order.id.value));

    expect(order.status.is(OrderStatusValue.DELIVERED)).toBe(true);
    expect(orderRepository.save).toHaveBeenCalledWith(order);
  });

  it('skips gracefully when the order is missing for a scheduled shipment', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await handlers.onShipmentScheduled(
      new ShipmentScheduled(uuidV4(), uuidV4(), new Date(), 'SwiftShip Logistics'),
    );

    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('skips gracefully when the order is missing for a completed delivery', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await handlers.onDeliveryCompleted(new DeliveryCompleted(uuidV4(), uuidV4()));

    expect(orderRepository.save).not.toHaveBeenCalled();
  });
});
