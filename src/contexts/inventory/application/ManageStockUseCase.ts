import { InventoryItem } from '../domain/InventoryItem';
import { InventoryRepository } from '../domain/InventoryRepository';
import { StockLevel } from '../domain/value-objects/StockLevel';
import { ProductId } from '../../../shared/domain/ProductId';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { logger } from '../../../shared/infrastructure/logger';

export interface UpsertStockInput {
  productId: string;
  quantity: number;
}

export interface StockOutput {
  productId: string;
  stock: number;
  updatedAt: Date;
}

export class ManageStockUseCase {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  public upsertStock = async (input: UpsertStockInput): Promise<StockOutput> => {
    const productId = ProductId.from(input.productId);
    const existing = await this.inventoryRepository.findByProductId(productId);

    let item: InventoryItem;
    if (existing) {
      existing.addStock(input.quantity);
      item = existing;
    } else {
      item = InventoryItem.create(productId, StockLevel.from(input.quantity));
    }
    await this.inventoryRepository.save(item);

    logger.info({ productId: input.productId, stock: item.stock.value }, 'Stock upserted');
    return this.toOutput(item);
  };

  public getStock = async (productIdValue: string): Promise<StockOutput> => {
    const item = await this.inventoryRepository.findByProductId(ProductId.from(productIdValue));
    if (!item) {
      throw CustomHttpException.notFound(
        `No inventory found for product: ${productIdValue}`,
        'INVENTORY_NOT_FOUND',
      );
    }
    return this.toOutput(item);
  };

  private toOutput = (item: InventoryItem): StockOutput => ({
    productId: item.productId.value,
    stock: item.stock.value,
    updatedAt: item.updatedAt,
  });
}
