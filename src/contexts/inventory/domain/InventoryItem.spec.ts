import { v4 as uuidV4 } from 'uuid';
import { InventoryItem } from './InventoryItem';
import { StockLevel } from './value-objects/StockLevel';
import { ProductId } from '../../../shared/domain/ProductId';
import { DomainError } from '../../../shared/errors/DomainError';

const buildItem = (stock = 10): InventoryItem =>
  InventoryItem.create(ProductId.from(uuidV4()), StockLevel.from(stock));

describe('InventoryItem aggregate', () => {
  describe('creation', () => {
    it('creates an inventory item with the given stock', () => {
      const item = buildItem(5);
      expect(item.stock.value).toBe(5);
    });

    it('rejects negative initial stock', () => {
      expect(() => StockLevel.from(-1)).toThrow(DomainError);
    });

    it('rejects non-integer stock', () => {
      expect(() => StockLevel.from(2.5)).toThrow(DomainError);
    });
  });

  describe('deductStock', () => {
    it('deducts stock when sufficient', () => {
      const item = buildItem(10);
      item.deductStock(4);
      expect(item.stock.value).toBe(6);
    });

    it('allows deducting the entire stock', () => {
      const item = buildItem(3);
      item.deductStock(3);
      expect(item.stock.value).toBe(0);
    });

    it('throws INSUFFICIENT_STOCK when stock is not enough', () => {
      const item = buildItem(2);
      expect(() => item.deductStock(3)).toThrow('Insufficient stock');
      expect(item.stock.value).toBe(2);
    });
  });

  describe('hasStockFor', () => {
    it('returns true when stock covers the quantity', () => {
      expect(buildItem(5).hasStockFor(5)).toBe(true);
    });

    it('returns false when stock is insufficient', () => {
      expect(buildItem(5).hasStockFor(6)).toBe(false);
    });
  });

  describe('addStock', () => {
    it('increases the stock level', () => {
      const item = buildItem(1);
      item.addStock(9);
      expect(item.stock.value).toBe(10);
    });

    it('rejects non-positive additions', () => {
      const item = buildItem(1);
      expect(() => item.addStock(0)).toThrow(DomainError);
      expect(() => item.addStock(-5)).toThrow(DomainError);
    });
  });

  describe('reconstitute', () => {
    it('rebuilds an item from persistence', () => {
      const productId = ProductId.from(uuidV4());
      const updatedAt = new Date('2026-01-01');
      const item = InventoryItem.reconstitute(productId, StockLevel.from(7), updatedAt);

      expect(item.productId.value).toBe(productId.value);
      expect(item.stock.value).toBe(7);
      expect(item.updatedAt).toEqual(updatedAt);
    });
  });
});
