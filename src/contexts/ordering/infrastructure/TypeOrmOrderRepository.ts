import { DataSource, Repository } from 'typeorm';
import { v4 as uuidV4 } from 'uuid';
import { Order } from '../domain/Order';
import { OrderItem } from '../domain/OrderItem';
import { OrderRepository } from '../domain/OrderRepository';
import { OrderId } from '../domain/value-objects/OrderId';
import { OrderStatus } from '../domain/value-objects/OrderStatus';
import { Quantity } from '../domain/value-objects/Quantity';
import { ProductId } from '../../../shared/domain/ProductId';
import { OrderEntity, OrderItemEntity } from './OrderEntity';

export class TypeOrmOrderRepository implements OrderRepository {
  private readonly repository: Repository<OrderEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(OrderEntity);
  }

  public save = async (order: Order): Promise<void> => {
    const exists = await this.repository.existsBy({ id: order.id.value });
    if (exists) {
      await this.repository.update({ id: order.id.value }, { status: order.status.value });
      return;
    }
    await this.repository.save(this.toEntity(order));
  };

  public findById = async (id: OrderId): Promise<Order | null> => {
    const entity = await this.repository.findOne({ where: { id: id.value } });
    return entity ? this.toDomain(entity) : null;
  };

  private toEntity = (order: Order): OrderEntity => {
    const entity = new OrderEntity();
    entity.id = order.id.value;
    entity.customerId = order.customerId;
    entity.status = order.status.value;
    entity.createdAt = order.createdAt;
    entity.items = order.items.map((item) => {
      const itemEntity = new OrderItemEntity();
      itemEntity.id = uuidV4();
      itemEntity.productId = item.productId.value;
      itemEntity.quantity = item.quantity.value;
      itemEntity.order = entity;
      return itemEntity;
    });
    return entity;
  };

  private toDomain = (entity: OrderEntity): Order =>
    Order.reconstitute(
      OrderId.from(entity.id),
      entity.customerId,
      entity.items.map((item) =>
        OrderItem.create(ProductId.from(item.productId), Quantity.from(item.quantity)),
      ),
      OrderStatus.from(entity.status),
      entity.createdAt,
    );
}
