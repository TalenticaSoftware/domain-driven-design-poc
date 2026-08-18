import { InventoryRepository } from '../domain/InventoryRepository';
import { ProductId } from '../../../shared/domain/ProductId';
import {
  StockValidator,
  StockValidationItem,
  StockValidationResult,
} from '../../ordering/application/ports/StockValidator';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { logger } from '../../../shared/infrastructure/logger';

export class StockValidationService implements StockValidator {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  public validateAndReserve = async (
    items: StockValidationItem[],
  ): Promise<StockValidationResult> => {
    const productIds = items.map((item) => ProductId.from(item.productId));
    const inventoryItems = await this.inventoryRepository.findByProductIds(productIds);
    const inventoryByProductId = new Map(
      inventoryItems.map((item) => [item.productId.value, item]),
    );

    const unavailableProductIds = items
      .filter((item) => {
        const inventoryItem = inventoryByProductId.get(item.productId);
        return !inventoryItem || !inventoryItem.hasStockFor(item.quantity);
      })
      .map((item) => item.productId);

    if (unavailableProductIds.length > 0) {
      logger.warn({ unavailableProductIds }, 'Stock validation failed');
      return { isAvailable: false, unavailableProductIds };
    }

    const updatedItems = items.map((item) => {
      const inventoryItem = inventoryByProductId.get(item.productId);
      if (!inventoryItem) {
        throw CustomHttpException.internal(
          `Inventory item missing for product ${item.productId}`,
          'INVENTORY_ITEM_MISSING',
        );
      }
      inventoryItem.deductStock(item.quantity);
      return inventoryItem;
    });
    await this.inventoryRepository.saveAll(updatedItems);

    logger.info({ productCount: items.length }, 'Stock validated and reserved');
    return { isAvailable: true, unavailableProductIds: [] };
  };
}
