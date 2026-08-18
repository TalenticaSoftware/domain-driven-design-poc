import { InventoryItem } from './InventoryItem';
import { ProductId } from '../../../shared/domain/ProductId';

export interface InventoryRepository {
  save(item: InventoryItem): Promise<void>;
  saveAll(items: InventoryItem[]): Promise<void>;
  findByProductId(productId: ProductId): Promise<InventoryItem | null>;
  findByProductIds(productIds: ProductId[]): Promise<InventoryItem[]>;
}
