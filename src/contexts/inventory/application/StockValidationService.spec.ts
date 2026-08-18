import { v4 as uuidV4 } from 'uuid';
import { StockValidationService } from './StockValidationService';
import { InventoryRepository } from '../domain/InventoryRepository';
import { InventoryItem } from '../domain/InventoryItem';
import { StockLevel } from '../domain/value-objects/StockLevel';
import { ProductId } from '../../../shared/domain/ProductId';

const buildInventoryItem = (productId: string, stock: number): InventoryItem =>
  InventoryItem.create(ProductId.from(productId), StockLevel.from(stock));

describe('StockValidationService', () => {
  let inventoryRepository: jest.Mocked<InventoryRepository>;
  let service: StockValidationService;

  beforeEach(() => {
    inventoryRepository = {
      save: jest.fn(),
      saveAll: jest.fn(),
      findByProductId: jest.fn(),
      findByProductIds: jest.fn(),
    };
    service = new StockValidationService(inventoryRepository);
  });

  it('reserves stock when all products have sufficient inventory', async () => {
    const productId = uuidV4();
    const item = buildInventoryItem(productId, 10);
    inventoryRepository.findByProductIds.mockResolvedValue([item]);

    const result = await service.validateAndReserve([{ productId, quantity: 4 }]);

    expect(result.isAvailable).toBe(true);
    expect(item.stock.value).toBe(6);
    expect(inventoryRepository.saveAll).toHaveBeenCalledWith([item]);
  });

  it('fails when a product has insufficient stock and reserves nothing', async () => {
    const productId = uuidV4();
    const item = buildInventoryItem(productId, 1);
    inventoryRepository.findByProductIds.mockResolvedValue([item]);

    const result = await service.validateAndReserve([{ productId, quantity: 5 }]);

    expect(result.isAvailable).toBe(false);
    expect(result.unavailableProductIds).toEqual([productId]);
    expect(item.stock.value).toBe(1);
    expect(inventoryRepository.saveAll).not.toHaveBeenCalled();
  });

  it('fails when a product has no inventory record at all', async () => {
    const productId = uuidV4();
    inventoryRepository.findByProductIds.mockResolvedValue([]);

    const result = await service.validateAndReserve([{ productId, quantity: 1 }]);

    expect(result.isAvailable).toBe(false);
    expect(result.unavailableProductIds).toEqual([productId]);
  });

  it('does not reserve any stock when one of multiple products is unavailable', async () => {
    const availableId = uuidV4();
    const unavailableId = uuidV4();
    const availableItem = buildInventoryItem(availableId, 10);
    inventoryRepository.findByProductIds.mockResolvedValue([availableItem]);

    const result = await service.validateAndReserve([
      { productId: availableId, quantity: 2 },
      { productId: unavailableId, quantity: 1 },
    ]);

    expect(result.isAvailable).toBe(false);
    expect(result.unavailableProductIds).toEqual([unavailableId]);
    expect(availableItem.stock.value).toBe(10);
    expect(inventoryRepository.saveAll).not.toHaveBeenCalled();
  });
});
