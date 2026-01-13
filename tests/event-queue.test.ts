import { EventQueue } from '../src/content/event-queue';
import { KeyboardEventData } from '../src/shared/types';

describe('EventQueue', () => {
  let queue: EventQueue;
  
  beforeEach(() => {
    queue = new EventQueue();
  });
  
  afterEach(() => {
    queue.clear();
  });
  
  describe('enqueue', () => {
    it('should enqueue events with delays', (done) => {
      const eventData: KeyboardEventData = {
        key: 'a',
        code: 'KeyA',
        keyCode: 65,
        which: 65,
        charCode: 97,
        location: 0,
        repeat: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        target: null,
      };
      
      let callbackCalled = false;
      
      queue.enqueue(eventData, 10, () => {
        callbackCalled = true;
        expect(callbackCalled).toBe(true);
        done();
      });
    });
    
    it('should maintain event order', (done) => {
      const events: string[] = [];
      const event1: KeyboardEventData = {
        key: 'a',
        code: 'KeyA',
        keyCode: 65,
        which: 65,
        charCode: 97,
        location: 0,
        repeat: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        target: null,
      };
      
      const event2: KeyboardEventData = {
        key: 'b',
        code: 'KeyB',
        keyCode: 66,
        which: 66,
        charCode: 98,
        location: 0,
        repeat: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        target: null,
      };
      
      // Enqueue with different delays but second should execute first
      queue.enqueue(event1, 50, () => {
        events.push('a');
        if (events.length === 2) {
          expect(events).toEqual(['b', 'a']);
          done();
        }
      });
      
      queue.enqueue(event2, 10, () => {
        events.push('b');
        if (events.length === 2) {
          expect(events).toEqual(['b', 'a']);
          done();
        }
      });
    });
  });
  
  describe('clear', () => {
    it('should clear all queued events', () => {
      const eventData: KeyboardEventData = {
        key: 'a',
        code: 'KeyA',
        keyCode: 65,
        which: 65,
        charCode: 97,
        location: 0,
        repeat: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        target: null,
      };
      
      let callbackCalled = false;
      
      queue.enqueue(eventData, 100, () => {
        callbackCalled = true;
      });
      
      queue.clear();
      
      // Wait longer than delay
      setTimeout(() => {
        expect(callbackCalled).toBe(false);
      }, 150);
    });
  });
});

