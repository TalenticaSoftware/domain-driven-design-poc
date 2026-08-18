import { v4 as uuidV4 } from 'uuid';
import { ProductId } from './ProductId';
import { DomainError } from '../errors/DomainError';
import { Order } from '../../contexts/ordering/domain/Order';
import { OrderItem } from '../../contexts/ordering/domain/OrderItem';
import { Quantity } from '../../contexts/ordering/domain/value-objects/Quantity';
import { OrderId } from '../../contexts/ordering/domain/value-objects/OrderId';
import { OrderStatus } from '../../contexts/ordering/domain/value-objects/OrderStatus';

const buildOrder = (): Order =>
  Order.create(uuidV4(), [OrderItem.create(ProductId.from(uuidV4()), Quantity.from(1))]);

describe('shared domain base classes', () => {
  describe('EntityId', () => {
    it('rejects a non-UUID identifier', () => {
      expect(() => ProductId.from('not-a-uuid')).toThrow(DomainError);
    });

    it('treats two ids with the same value as equal', () => {
      const value = uuidV4();
      expect(ProductId.from(value).equals(ProductId.from(value))).toBe(true);
    });

    it('treats ids with different values as not equal', () => {
      expect(ProductId.from(uuidV4()).equals(ProductId.from(uuidV4()))).toBe(false);
    });

    it('is not equal to undefined', () => {
      expect(ProductId.from(uuidV4()).equals(undefined)).toBe(false);
    });
  });

  describe('ValueObject', () => {
    it('treats quantities with the same value as equal', () => {
      expect(Quantity.from(5).equals(Quantity.from(5))).toBe(true);
    });

    it('treats quantities with different values as not equal', () => {
      expect(Quantity.from(5).equals(Quantity.from(6))).toBe(false);
    });
  });

  describe('AggregateRoot equality', () => {
    it('compares aggregates by identity', () => {
      const order = buildOrder();
      const sameIdentity = Order.reconstitute(
        OrderId.from(order.id.value),
        order.customerId,
        [...order.items],
        OrderStatus.from(order.status.value),
        order.createdAt,
      );

      expect(order.equals(sameIdentity)).toBe(true);
      expect(order.equals(buildOrder())).toBe(false);
      expect(order.equals(undefined)).toBe(false);
    });
  });
});
