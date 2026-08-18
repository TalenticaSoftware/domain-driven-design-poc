import { DataSource, In, Repository } from 'typeorm';
import { InventoryItem } from '../domain/InventoryItem';
import { InventoryRepository } from '../domain/InventoryRepository';
import { StockLevel } from '../domain/value-objects/StockLevel';
import { ProductId } from '../../../shared/domain/ProductId';
import { InventoryEntity } from './InventoryEntity';

export class TypeOrmInventoryRepository implements InventoryRepository {
  private readonly repository: Repository<InventoryEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(InventoryEntity);
  }

  public save = async (item: InventoryItem): Promise<void> => {
    await this.repository.save(this.toEntity(item));
  };

  public saveAll = async (items: InventoryItem[]): Promise<void> => {
    await this.repository.save(items.map(this.toEntity));
  };

  public findByProductId = async (productId: ProductId): Promise<InventoryItem | null> => {
    const entity = await this.repository.findOne({ where: { productId: productId.value } });
    return entity ? this.toDomain(entity) : null;
  };

  public findByProductIds = async (productIds: ProductId[]): Promise<InventoryItem[]> => {
    const entities = await this.repository.find({
      where: { productId: In(productIds.map((id) => id.value)) },
    });
    return entities.map(this.toDomain);
  };

  private toEntity = (item: InventoryItem): InventoryEntity => {
    const entity = new InventoryEntity();
    entity.productId = item.productId.value;
    entity.stock = item.stock.value;
    entity.updatedAt = item.updatedAt;
    return entity;
  };

  private toDomain = (entity: InventoryEntity): InventoryItem =>
    InventoryItem.reconstitute(
      ProductId.from(entity.productId),
      StockLevel.from(entity.stock),
      entity.updatedAt,
    );
}
