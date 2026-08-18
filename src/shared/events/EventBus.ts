import { DomainEvent } from '../domain/DomainEvent';
import { logger } from '../infrastructure/logger';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void>;

export interface IEventBus {
  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void;
  publish(events: DomainEvent[]): Promise<void>;
}

export class InProcessEventBus implements IEventBus {
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  public subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...existing, handler as EventHandler]);
    logger.info({ eventName }, 'Event handler subscribed');
  }

  public async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const eventHandlers = this.handlers.get(event.eventName) ?? [];
      logger.info(
        { eventName: event.eventName, handlerCount: eventHandlers.length },
        'Publishing domain event',
      );
      for (const handler of eventHandlers) {
        try {
          await handler(event);
        } catch (error) {
          logger.error(
            { eventName: event.eventName, error: (error as Error).message },
            'Event handler failed',
          );
          throw error;
        }
      }
    }
  }
}
