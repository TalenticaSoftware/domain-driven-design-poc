import { DomainEvent } from './DomainEvent';
import { EntityId } from './EntityId';

export abstract class AggregateRoot<TId extends EntityId> {
  private domainEvents: DomainEvent[] = [];

  protected constructor(public readonly id: TId) {}

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents = [...this.domainEvents, event];
  }

  public pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  public equals(other?: AggregateRoot<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.id.equals(other.id);
  }
}
