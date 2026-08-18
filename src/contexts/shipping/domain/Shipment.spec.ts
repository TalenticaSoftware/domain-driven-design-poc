import { v4 as uuidV4 } from 'uuid';
import { Shipment } from './Shipment';
import { ShipmentId } from './value-objects/ShipmentId';
import { ShipmentStatus, ShipmentStatusValue } from './value-objects/ShipmentStatus';
import { DeliveryDate } from './value-objects/DeliveryDate';
import { DeliveryPartner } from './value-objects/DeliveryPartner';
import { DomainError } from '../../../shared/errors/DomainError';
import {
  ShipmentScheduled,
  ShipmentStatusUpdated,
  DeliveryCompleted,
} from './events/ShipmentEvents';

const futureDate = (): Date => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

const buildShipment = (): Shipment =>
  Shipment.schedule(uuidV4(), DeliveryDate.scheduleFor(futureDate()), DeliveryPartner.default());

describe('Shipment aggregate', () => {
  describe('schedule', () => {
    it('creates a SCHEDULED shipment and emits ShipmentScheduled', () => {
      const shipment = buildShipment();

      expect(shipment.status.is(ShipmentStatusValue.SCHEDULED)).toBe(true);
      const events = shipment.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ShipmentScheduled);
    });

    it('rejects a delivery date in the past', () => {
      const past = new Date(Date.now() - 1000);
      expect(() => DeliveryDate.scheduleFor(past)).toThrow('must be in the future');
    });

    it('rejects an invalid delivery date', () => {
      expect(() => DeliveryDate.scheduleFor(new Date('invalid'))).toThrow(DomainError);
    });

    it('rejects an unsupported delivery partner', () => {
      expect(() => DeliveryPartner.from('Unknown Couriers')).toThrow(DomainError);
    });
  });

  describe('advanceTo', () => {
    it('progresses SCHEDULED -> DISPATCHED -> IN_TRANSIT -> DELIVERED', () => {
      const shipment = buildShipment();
      shipment.pullDomainEvents();

      shipment.advanceTo(ShipmentStatusValue.DISPATCHED);
      shipment.advanceTo(ShipmentStatusValue.IN_TRANSIT);
      shipment.advanceTo(ShipmentStatusValue.DELIVERED);

      expect(shipment.status.is(ShipmentStatusValue.DELIVERED)).toBe(true);
      const events = shipment.pullDomainEvents();
      expect(events.filter((e) => e instanceof ShipmentStatusUpdated)).toHaveLength(3);
      expect(events.filter((e) => e instanceof DeliveryCompleted)).toHaveLength(1);
    });

    it('cannot skip statuses', () => {
      const shipment = buildShipment();
      expect(() => shipment.advanceTo(ShipmentStatusValue.DELIVERED)).toThrow(
        'Invalid shipment status transition',
      );
    });

    it('cannot move backwards', () => {
      const shipment = buildShipment();
      shipment.advanceTo(ShipmentStatusValue.DISPATCHED);
      expect(() => shipment.advanceTo(ShipmentStatusValue.SCHEDULED)).toThrow(DomainError);
    });

    it('cannot advance a delivered shipment', () => {
      const shipment = buildShipment();
      shipment.advanceTo(ShipmentStatusValue.DISPATCHED);
      shipment.advanceTo(ShipmentStatusValue.IN_TRANSIT);
      shipment.advanceTo(ShipmentStatusValue.DELIVERED);
      expect(() => shipment.advanceTo(ShipmentStatusValue.DISPATCHED)).toThrow(DomainError);
    });
  });

  describe('reconstitute', () => {
    it('rebuilds a shipment from persistence without events', () => {
      const id = ShipmentId.from(uuidV4());
      const shipment = Shipment.reconstitute(
        id,
        uuidV4(),
        ShipmentStatus.from('IN_TRANSIT'),
        DeliveryDate.reconstitute(futureDate()),
        DeliveryPartner.default(),
        new Date(),
      );

      expect(shipment.id.value).toBe(id.value);
      expect(shipment.status.is(ShipmentStatusValue.IN_TRANSIT)).toBe(true);
      expect(shipment.pullDomainEvents()).toHaveLength(0);
    });

    it('rejects an invalid status string', () => {
      expect(() => ShipmentStatus.from('LOST')).toThrow(DomainError);
    });
  });
});
