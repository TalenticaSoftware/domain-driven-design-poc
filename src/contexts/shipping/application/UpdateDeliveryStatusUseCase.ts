import { ShipmentRepository } from '../domain/ShipmentRepository';
import { ShipmentId } from '../domain/value-objects/ShipmentId';
import { ShipmentStatusValue } from '../domain/value-objects/ShipmentStatus';
import { IEventBus } from '../../../shared/events/EventBus';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { logger } from '../../../shared/infrastructure/logger';

export interface UpdateDeliveryStatusOutput {
  shipmentId: string;
  orderId: string;
  status: string;
}

export class UpdateDeliveryStatusUseCase {
  constructor(
    private readonly shipmentRepository: ShipmentRepository,
    private readonly eventBus: IEventBus,
  ) {}

  public execute = async (
    shipmentId: string,
    nextStatus: ShipmentStatusValue,
  ): Promise<UpdateDeliveryStatusOutput> => {
    const shipment = await this.shipmentRepository.findById(ShipmentId.from(shipmentId));
    if (!shipment) {
      throw CustomHttpException.notFound(
        `Shipment not found: ${shipmentId}`,
        'SHIPMENT_NOT_FOUND',
      );
    }

    shipment.advanceTo(nextStatus);
    await this.shipmentRepository.save(shipment);
    await this.eventBus.publish(shipment.pullDomainEvents());

    logger.info({ shipmentId, status: nextStatus }, 'Shipment status updated');
    return {
      shipmentId: shipment.id.value,
      orderId: shipment.orderId,
      status: shipment.status.value,
    };
  };
}
