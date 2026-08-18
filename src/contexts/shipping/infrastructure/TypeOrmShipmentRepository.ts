import { DataSource, Repository } from 'typeorm';
import { Shipment } from '../domain/Shipment';
import { ShipmentRepository } from '../domain/ShipmentRepository';
import { ShipmentId } from '../domain/value-objects/ShipmentId';
import { ShipmentStatus } from '../domain/value-objects/ShipmentStatus';
import { DeliveryDate } from '../domain/value-objects/DeliveryDate';
import { DeliveryPartner } from '../domain/value-objects/DeliveryPartner';
import { ShipmentEntity } from './ShipmentEntity';

export class TypeOrmShipmentRepository implements ShipmentRepository {
  private readonly repository: Repository<ShipmentEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(ShipmentEntity);
  }

  public save = async (shipment: Shipment): Promise<void> => {
    await this.repository.save(this.toEntity(shipment));
  };

  public findById = async (id: ShipmentId): Promise<Shipment | null> => {
    const entity = await this.repository.findOne({ where: { id: id.value } });
    return entity ? this.toDomain(entity) : null;
  };

  public findByOrderId = async (orderId: string): Promise<Shipment | null> => {
    const entity = await this.repository.findOne({ where: { orderId } });
    return entity ? this.toDomain(entity) : null;
  };

  private toEntity = (shipment: Shipment): ShipmentEntity => {
    const entity = new ShipmentEntity();
    entity.id = shipment.id.value;
    entity.orderId = shipment.orderId;
    entity.status = shipment.status.value;
    entity.deliveryDate = shipment.deliveryDate.value;
    entity.deliveryPartner = shipment.deliveryPartner.name;
    entity.createdAt = shipment.createdAt;
    return entity;
  };

  private toDomain = (entity: ShipmentEntity): Shipment =>
    Shipment.reconstitute(
      ShipmentId.from(entity.id),
      entity.orderId,
      ShipmentStatus.from(entity.status),
      DeliveryDate.reconstitute(entity.deliveryDate),
      DeliveryPartner.from(entity.deliveryPartner),
      entity.createdAt,
    );
}
