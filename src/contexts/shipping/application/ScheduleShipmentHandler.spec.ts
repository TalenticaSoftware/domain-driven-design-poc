import { v4 as uuidV4 } from 'uuid';
import { ScheduleShipmentHandler } from './ScheduleShipmentHandler';
import { UpdateDeliveryStatusUseCase } from './UpdateDeliveryStatusUseCase';
import { ShipmentRepository } from '../domain/ShipmentRepository';
import { Shipment } from '../domain/Shipment';
import { ShipmentStatusValue } from '../domain/value-objects/ShipmentStatus';
import { DeliveryDate } from '../domain/value-objects/DeliveryDate';
import { DeliveryPartner } from '../domain/value-objects/DeliveryPartner';
import { OrderConfirmed } from '../../ordering/domain/events/OrderEvents';
import { IEventBus } from '../../../shared/events/EventBus';
import { CustomHttpException } from '../../../shared/errors/CustomHttpException';
import { ShipmentScheduled, DeliveryCompleted } from '../domain/events/ShipmentEvents';

const buildRepositoryMock = (): jest.Mocked<ShipmentRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  findByOrderId: jest.fn(),
});

const buildEventBusMock = (): jest.Mocked<IEventBus> => ({
  publish: jest.fn(),
  subscribe: jest.fn(),
});

const buildScheduledShipment = (orderId = uuidV4()): Shipment =>
  Shipment.schedule(
    orderId,
    DeliveryDate.scheduleFor(new Date(Date.now() + 86_400_000)),
    DeliveryPartner.default(),
  );

describe('ScheduleShipmentHandler', () => {
  let shipmentRepository: jest.Mocked<ShipmentRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let handler: ScheduleShipmentHandler;

  beforeEach(() => {
    shipmentRepository = buildRepositoryMock();
    eventBus = buildEventBusMock();
    handler = new ScheduleShipmentHandler(shipmentRepository, eventBus);
  });

  it('schedules a shipment when an order is confirmed', async () => {
    const orderId = uuidV4();
    shipmentRepository.findByOrderId.mockResolvedValue(null);

    await handler.onOrderConfirmed(new OrderConfirmed(orderId, []));

    expect(shipmentRepository.save).toHaveBeenCalledTimes(1);
    const savedShipment = shipmentRepository.save.mock.calls[0][0];
    expect(savedShipment.orderId).toBe(orderId);
    expect(savedShipment.status.is(ShipmentStatusValue.SCHEDULED)).toBe(true);
    const publishedEvents = eventBus.publish.mock.calls[0][0];
    expect(publishedEvents[0]).toBeInstanceOf(ShipmentScheduled);
  });

  it('does not schedule a duplicate shipment for the same order', async () => {
    const orderId = uuidV4();
    shipmentRepository.findByOrderId.mockResolvedValue(buildScheduledShipment(orderId));

    await handler.onOrderConfirmed(new OrderConfirmed(orderId, []));

    expect(shipmentRepository.save).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});

describe('UpdateDeliveryStatusUseCase', () => {
  let shipmentRepository: jest.Mocked<ShipmentRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let useCase: UpdateDeliveryStatusUseCase;

  beforeEach(() => {
    shipmentRepository = buildRepositoryMock();
    eventBus = buildEventBusMock();
    useCase = new UpdateDeliveryStatusUseCase(shipmentRepository, eventBus);
  });

  it('advances a shipment to the next status', async () => {
    const shipment = buildScheduledShipment();
    shipment.pullDomainEvents();
    shipmentRepository.findById.mockResolvedValue(shipment);

    const result = await useCase.execute(shipment.id.value, ShipmentStatusValue.DISPATCHED);

    expect(result.status).toBe('DISPATCHED');
    expect(shipmentRepository.save).toHaveBeenCalledTimes(1);
  });

  it('publishes DeliveryCompleted when the shipment reaches DELIVERED', async () => {
    const shipment = buildScheduledShipment();
    shipment.advanceTo(ShipmentStatusValue.DISPATCHED);
    shipment.advanceTo(ShipmentStatusValue.IN_TRANSIT);
    shipment.pullDomainEvents();
    shipmentRepository.findById.mockResolvedValue(shipment);

    await useCase.execute(shipment.id.value, ShipmentStatusValue.DELIVERED);

    const publishedEvents = eventBus.publish.mock.calls[0][0];
    expect(publishedEvents.some((e) => e instanceof DeliveryCompleted)).toBe(true);
  });

  it('throws 404 when the shipment does not exist', async () => {
    shipmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(uuidV4(), ShipmentStatusValue.DISPATCHED)).rejects.toThrow(
      CustomHttpException,
    );
  });

  it('rejects an invalid status transition', async () => {
    const shipment = buildScheduledShipment();
    shipment.pullDomainEvents();
    shipmentRepository.findById.mockResolvedValue(shipment);

    await expect(useCase.execute(shipment.id.value, ShipmentStatusValue.DELIVERED)).rejects.toThrow(
      'Invalid shipment status transition',
    );
    expect(shipmentRepository.save).not.toHaveBeenCalled();
  });
});
