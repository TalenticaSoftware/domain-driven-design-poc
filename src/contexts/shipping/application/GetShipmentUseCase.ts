import { Shipment } from '../domain/Shipment';
import { ShipmentRepository } from '../domain/ShipmentRepository';
import { ShipmentId } from '../domain/value-objects/ShipmentId';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';

export interface ShipmentDetailsOutput {
  shipmentId: string;
  orderId: string;
  status: string;
  deliveryDate: Date;
  deliveryPartner: string;
  createdAt: Date;
}

export class GetShipmentUseCase {
  constructor(private readonly shipmentRepository: ShipmentRepository) {}

  public execute = async (shipmentId: string): Promise<ShipmentDetailsOutput> => {
    const shipment = await this.shipmentRepository.findById(ShipmentId.from(shipmentId));
    if (!shipment) {
      throw CustomHttpException.notFound(
        `Shipment not found: ${shipmentId}`,
        'SHIPMENT_NOT_FOUND',
      );
    }
    return this.toOutput(shipment);
  };

  public findByOrderId = async (orderId: string): Promise<ShipmentDetailsOutput | null> => {
    const shipment = await this.shipmentRepository.findByOrderId(orderId);
    return shipment ? this.toOutput(shipment) : null;
  };

  private toOutput = (shipment: Shipment): ShipmentDetailsOutput => ({
    shipmentId: shipment.id.value,
    orderId: shipment.orderId,
    status: shipment.status.value,
    deliveryDate: shipment.deliveryDate.value,
    deliveryPartner: shipment.deliveryPartner.name,
    createdAt: shipment.createdAt,
  });
}
