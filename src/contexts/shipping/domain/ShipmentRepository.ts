import { Shipment } from './Shipment';
import { ShipmentId } from './value-objects/ShipmentId';

export interface ShipmentRepository {
  save(shipment: Shipment): Promise<void>;
  findById(id: ShipmentId): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment | null>;
}
