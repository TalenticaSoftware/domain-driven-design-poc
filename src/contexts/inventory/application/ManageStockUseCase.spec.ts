import { v4 as uuidV4 } from 'uuid';
import { ManageStockUseCase } from './ManageStockUseCase';
import { InventoryRepository } from '../domain/InventoryRepository';
import { InventoryItem } from '../domain/InventoryItem';
import { StockLevel } from '../domain/value-objects/StockLevel';
import { ProductId } from '../../../shared/domain/ProductId';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { DomainError } from '../../../shared/errors/DomainError';

describe('ManageStockUseCase', () => {
  let inventoryRepository: jest.Mocked<InventoryRepository>;
  let useCase: ManageStockUseCase;

  beforeEach(() => {
    inventoryRepository = {
      save: jest.fn(),
      saveAll: jest.fn(),
      findByProductId: jest.fn(),
      findByProductIds: jest.fn(),
    };
    useCase = new ManageStockUseCase(inventoryRepository);
  });

  describe('upsertStock', () => {
    it('creates a new inventory record when none exists', async () => {
      const productId = uuidV4();
      inventoryRepository.findByProductId.mockResolvedValue(null);

      const result = await useCase.upsertStock({ productId, quantity: 10 });

      expect(result.productId).toBe(productId);
      expect(result.stock).toBe(10);
      expect(inventoryRepository.save).toHaveBeenCalledTimes(1);
    });

    it('adds to existing stock when a record exists', async () => {
      const productId = uuidV4();
      const existing = InventoryItem.create(ProductId.from(productId), StockLevel.from(5));
      inventoryRepository.findByProductId.mockResolvedValue(existing);

      const result = await useCase.upsertStock({ productId, quantity: 7 });

      expect(result.stock).toBe(12);
      expect(inventoryRepository.save).toHaveBeenCalledWith(existing);
    });

    it('propagates a domain error for an invalid quantity', async () => {
      const productId = uuidV4();
      inventoryRepository.findByProductId.mockResolvedValue(null);

      await expect(useCase.upsertStock({ productId, quantity: -2 })).rejects.toThrow(
        DomainError,
      );
      expect(inventoryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getStock', () => {
    it('returns the stock for an existing product', async () => {
      const productId = uuidV4();
      inventoryRepository.findByProductId.mockResolvedValue(
        InventoryItem.create(ProductId.from(productId), StockLevel.from(4)),
      );

      const result = await useCase.getStock(productId);

      expect(result.stock).toBe(4);
    });

    it('throws 404 when no inventory record exists', async () => {
      inventoryRepository.findByProductId.mockResolvedValue(null);
      await expect(useCase.getStock(uuidV4())).rejects.toThrow(CustomHttpException);
    });
  });
});
