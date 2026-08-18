import { v4 as uuidV4 } from 'uuid';
import { Order } from './Order';
import { OrderItem } from './OrderItem';
import { OrderId } from './value-objects/OrderId';
import { OrderStatus, OrderStatusValue } from './value-objects/OrderStatus';
import { Quantity } from './value-objects/Quantity';
import { ProductId } from '../../../shared/domain/ProductId';
import { DomainError } from '../../../shared/errors/DomainError';
import { OrderCreated, OrderConfirmed, OrderRejected } from './events/OrderEvents';

const buildItem = (productId = uuidV4(), quantity = 2): OrderItem =>
  OrderItem.create(ProductId.from(productId), Quantity.from(quantity));

const buildOrder = (items: OrderItem[] = [buildItem()]): Order =>
  Order.create(uuidV4(), items);

describe('Order aggregate', () => {
  describe('create', () => {
    it('creates an order with CREATED status and emits OrderCreated', () => {
      const order = buildOrder();

      expect(order.status.is(OrderStatusValue.CREATED)).toBe(true);
      const events = order.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderCreated);
    });

    it('rejects an order with no items', () => {
      expect(() => buildOrder([])).toThrow(DomainError);
      expect(() => buildOrder([])).toThrow('at least one item');
    });

    it('rejects duplicate products in the same order', () => {
      const productId = uuidV4();
      expect(() => buildOrder([buildItem(productId), buildItem(productId)])).toThrow(
        'duplicate products',
      );
    });

    it('rejects non-positive quantities', () => {
      expect(() => Quantity.from(0)).toThrow(DomainError);
      expect(() => Quantity.from(-1)).toThrow(DomainError);
      expect(() => Quantity.from(1.5)).toThrow(DomainError);
    });
  });

  describe('confirm', () => {
    it('transitions CREATED -> CONFIRMED and emits OrderConfirmed', () => {
      const order = buildOrder();
      order.pullDomainEvents();

      order.confirm();

      expect(order.status.is(OrderStatusValue.CONFIRMED)).toBe(true);
      const events = order.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(OrderConfirmed);
    });

    it('cannot confirm an already confirmed order', () => {
      const order = buildOrder();
      order.confirm();

      expect(() => order.confirm()).toThrow('Invalid order status transition');
    });
  });

  describe('reject', () => {
    it('transitions CREATED -> REJECTED and emits OrderRejected', () => {
      const order = buildOrder();
      order.pullDomainEvents();

      order.reject('Insufficient stock');

      expect(order.status.is(OrderStatusValue.REJECTED)).toBe(true);
      const events = order.pullDomainEvents();
      expect(events[0]).toBeInstanceOf(OrderRejected);
      expect((events[0] as OrderRejected).reason).toBe('Insufficient stock');
    });

    it('cannot reject a confirmed order', () => {
      const order = buildOrder();
      order.confirm();

      expect(() => order.reject('too late')).toThrow(DomainError);
    });
  });

  describe('shipping lifecycle', () => {
    it('follows CONFIRMED -> SHIPPED -> DELIVERED', () => {
      const order = buildOrder();
      order.confirm();
      order.markShipped();
      expect(order.status.is(OrderStatusValue.SHIPPED)).toBe(true);

      order.markDelivered();
      expect(order.status.is(OrderStatusValue.DELIVERED)).toBe(true);
    });

    it('cannot ship an unconfirmed order', () => {
      const order = buildOrder();
      expect(() => order.markShipped()).toThrow(DomainError);
    });

    it('cannot deliver an unshipped order', () => {
      const order = buildOrder();
      order.confirm();
      expect(() => order.markDelivered()).toThrow(DomainError);
    });
  });

  describe('reconstitute', () => {
    it('rebuilds an order from persistence without emitting events', () => {
      const id = OrderId.from(uuidV4());
      const order = Order.reconstitute(
        id,
        uuidV4(),
        [buildItem()],
        OrderStatus.from('CONFIRMED'),
        new Date(),
      );

      expect(order.id.value).toBe(id.value);
      expect(order.status.is(OrderStatusValue.CONFIRMED)).toBe(true);
      expect(order.pullDomainEvents()).toHaveLength(0);
    });

    it('rejects an invalid status string', () => {
      expect(() => OrderStatus.from('UNKNOWN')).toThrow(DomainError);
    });
  });
});
