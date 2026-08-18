import { v4 as uuidV4 } from 'uuid';
import { GetShipmentUseCase } from './GetShipmentUseCase';
import { ShipmentRepository } from '../domain/ShipmentRepository';
import { Shipment } from '../domain/Shipment';
import { DeliveryDate } from '../domain/value-objects/DeliveryDate';
import { DeliveryPartner } from '../domain/value-objects/DeliveryPartner';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';

const buildShipment = (orderId = uuidV4()): Shipment => {
  const shipment = Shipment.schedule(
    orderId,
    DeliveryDate.scheduleFor(new Date(Date.now() + 86_400_000)),
    DeliveryPartner.default(),
  );
  shipment.pullDomainEvents();
  return shipment;
};

describe('GetShipmentUseCase', () => {
  let shipmentRepository: jest.Mocked<ShipmentRepository>;
  let useCase: GetShipmentUseCase;

  beforeEach(() => {
    shipmentRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByOrderId: jest.fn(),
    };
    useCase = new GetShipmentUseCase(shipmentRepository);
  });

  describe('execute', () => {
    it('returns shipment details', async () => {
      const shipment = buildShipment();
      shipmentRepository.findById.mockResolvedValue(shipment);

      const result = await useCase.execute(shipment.id.value);

      expect(result.shipmentId).toBe(shipment.id.value);
      expect(result.status).toBe('SCHEDULED');
      expect(result.deliveryPartner).toBe(shipment.deliveryPartner.name);
    });

    it('throws 404 when the shipment does not exist', async () => {
      shipmentRepository.findById.mockResolvedValue(null);
      await expect(useCase.execute(uuidV4())).rejects.toThrow(CustomHttpException);
    });
  });

  describe('findByOrderId', () => {
    it('returns the shipment for an order', async () => {
      const orderId = uuidV4();
      shipmentRepository.findByOrderId.mockResolvedValue(buildShipment(orderId));

      const result = await useCase.findByOrderId(orderId);

      expect(result).not.toBeNull();
      expect(result?.orderId).toBe(orderId);
    });

    it('returns null when the order has no shipment', async () => {
      shipmentRepository.findByOrderId.mockResolvedValue(null);
      expect(await useCase.findByOrderId(uuidV4())).toBeNull();
    });
  });
});
