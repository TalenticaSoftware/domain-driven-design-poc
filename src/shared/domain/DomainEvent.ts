export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public abstract readonly eventName: string;

  protected constructor() {
    this.occurredAt = new Date();
  }
}
