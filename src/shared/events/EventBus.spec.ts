import { InProcessEventBus } from './EventBus';
import { DomainEvent } from '../domain/DomainEvent';

class TestEvent extends DomainEvent {
  public static readonly EVENT_NAME = 'test.event';
  public readonly eventName = TestEvent.EVENT_NAME;

  constructor(public readonly payload: string) {
    super();
  }
}

class OtherEvent extends DomainEvent {
  public static readonly EVENT_NAME = 'test.other-event';
  public readonly eventName = OtherEvent.EVENT_NAME;

  constructor() {
    super();
  }
}

describe('InProcessEventBus', () => {
  let eventBus: InProcessEventBus;

  beforeEach(() => {
    eventBus = new InProcessEventBus();
  });

  it('delivers a published event to its subscriber', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    eventBus.subscribe(TestEvent.EVENT_NAME, handler);

    await eventBus.publish([new TestEvent('hello')]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as TestEvent).payload).toBe('hello');
  });

  it('delivers events to multiple subscribers in order', async () => {
    const callOrder: string[] = [];
    eventBus.subscribe(TestEvent.EVENT_NAME, async () => {
      callOrder.push('first');
    });
    eventBus.subscribe(TestEvent.EVENT_NAME, async () => {
      callOrder.push('second');
    });

    await eventBus.publish([new TestEvent('x')]);

    expect(callOrder).toEqual(['first', 'second']);
  });

  it('does not invoke handlers for unrelated events', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    eventBus.subscribe(TestEvent.EVENT_NAME, handler);

    await eventBus.publish([new OtherEvent()]);

    expect(handler).not.toHaveBeenCalled();
  });

  it('publishes silently when there are no subscribers', async () => {
    await expect(eventBus.publish([new TestEvent('no-subs')])).resolves.toBeUndefined();
  });

  it('propagates handler failures to the publisher', async () => {
    eventBus.subscribe(TestEvent.EVENT_NAME, async () => {
      throw new Error('handler failed');
    });

    await expect(eventBus.publish([new TestEvent('boom')])).rejects.toThrow('handler failed');
  });
});
