/**
 * Effect Examples
 *
 * Effects represent side effects that reducers want to perform.
 * Reducers are pure, so they return Effect objects instead of performing side effects directly.
 */

import { emitTo, batch, none, executeEffect, executeEffects } from '../src/effect.js';
import { createCapability } from '../src/capability.js';
import { createMessage, type MessageOf } from '../src/message.js';
import { stay, type Reducer } from '../src/reducer.js';

// Example 1: Basic EmitTo Effect
console.log('=== Example 1: Basic EmitTo ===');
{
  type LogMsg = MessageOf<'log', { text: string }>;

  const logs: string[] = [];
  const logCapability = createCapability<LogMsg>((msg) => {
    logs.push(msg.text);
    console.log(`[LOG] ${msg.text}`);
  });

  // Create an effect
  const effect = emitTo(logCapability, createMessage('log', { text: 'Hello from effect!' }));

  console.log('Effect type:', effect.type);

  // Execute the effect
  executeEffect(effect);

  console.log('Collected logs:', logs);
}

// Example 2: Batch Effects
console.log('\n=== Example 2: Batch Effects ===');
{
  type EventMsg = MessageOf<'event', { name: string }>;

  const events: string[] = [];
  const eventCapability = createCapability<EventMsg>((msg) => {
    events.push(msg.name);
    console.log(`[EVENT] ${msg.name}`);
  });

  // Create multiple effects in a batch
  const batchEffect = batch([
    emitTo(eventCapability, createMessage('event', { name: 'app.start' })),
    emitTo(eventCapability, createMessage('event', { name: 'user.login' })),
    emitTo(eventCapability, createMessage('event', { name: 'data.load' })),
  ]);

  console.log('Batch effect type:', batchEffect.type);
  console.log('Number of effects:', batchEffect.effects.length);

  // Execute all effects in the batch
  executeEffect(batchEffect);

  console.log('Collected events:', events);
}

// Example 3: None Effect
console.log('\n=== Example 3: None Effect ===');
{
  const noneEffect = none();

  console.log('None effect type:', noneEffect.type);

  // Executing none does nothing (but is safe)
  executeEffect(noneEffect);

  console.log('None effect executed successfully (no-op)');
}

// Example 4: Effects in Reducers
console.log('\n=== Example 4: Effects in Reducers ===');
{
  type State = { count: number };
  type Msg = MessageOf<'increment', { amount: number }> | MessageOf<'notify', { value: number }>;

  const notifications: number[] = [];
  const notifyCap = createCapability<Msg>((msg) => {
    if (msg.type === 'notify') {
      notifications.push(msg.value);
      console.log(`  [NOTIFICATION] Count reached ${msg.value}`);
    }
  });

  // Reducer that emits effects when count reaches milestones
  const counterReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'increment') {
      const newCount = state.count + msg.amount;

      // Emit notification effect at multiples of 10
      const effects = newCount % 10 === 0
        ? [emitTo(notifyCap, createMessage('notify', { value: newCount }))]
        : [];

      return stay({ count: newCount }, counterReducer, effects);
    }
    return stay(state, counterReducer);
  };

  let state: State = { count: 0 };

  // Process messages and execute effects
  const process = (msg: Msg) => {
    const result = counterReducer(state, msg);
    state = result.state;
    executeEffects(result.effects);
  };

  console.log('Processing increments:');
  process(createMessage('increment', { amount: 5 }));  // count = 5, no notification
  process(createMessage('increment', { amount: 5 }));  // count = 10, notification!
  process(createMessage('increment', { amount: 8 }));  // count = 18, no notification
  process(createMessage('increment', { amount: 2 }));  // count = 20, notification!

  console.log('Final count:', state.count);
  console.log('Notifications sent:', notifications);
}

// Example 5: Complex Effect Composition
console.log('\n=== Example 5: Complex Effect Composition ===');
{
  type LogMsg = MessageOf<'log', { level: string; text: string }>;
  type MetricMsg = MessageOf<'metric', { name: string; value: number }>;

  const logger = createCapability<LogMsg>((msg) => {
    console.log(`  [${msg.level.toUpperCase()}] ${msg.text}`);
  });

  const metrics = createCapability<MetricMsg>((msg) => {
    console.log(`  [METRIC] ${msg.name} = ${msg.value}`);
  });

  // Compose complex nested effects
  const effects = batch([
    emitTo(logger, createMessage('log', { level: 'info', text: 'Starting process' })),
    batch([
      emitTo(metrics, createMessage('metric', { name: 'process.start', value: Date.now() })),
      emitTo(logger, createMessage('log', { level: 'debug', text: 'Initializing resources' })),
    ]),
    emitTo(logger, createMessage('log', { level: 'info', text: 'Process running' })),
    batch([
      emitTo(metrics, createMessage('metric', { name: 'process.step1', value: 100 })),
      emitTo(metrics, createMessage('metric', { name: 'process.step2', value: 200 })),
    ]),
    emitTo(logger, createMessage('log', { level: 'info', text: 'Process complete' })),
  ]);

  console.log('Executing complex nested effects:');
  executeEffect(effects);
}

// Example 6: Conditional Effects
console.log('\n=== Example 6: Conditional Effects ===');
{
  type State = { value: number; threshold: number };
  type Msg = MessageOf<'update', { value: number }> | MessageOf<'alert', { message: string }>;

  const alerts: string[] = [];
  const alertCap = createCapability<Msg>((msg) => {
    if (msg.type === 'alert') {
      alerts.push(msg.message);
      console.log(`  [ALERT] ${msg.message}`);
    }
  });

  const monitorReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'update') {
      const newValue = msg.value;

      // Conditionally create effects based on value
      const effects = [];

      if (newValue > state.threshold) {
        effects.push(
          emitTo(alertCap, createMessage('alert', {
            message: `Value ${newValue} exceeds threshold ${state.threshold}`,
          }))
        );
      }

      if (newValue < 0) {
        effects.push(
          emitTo(alertCap, createMessage('alert', {
            message: `Negative value detected: ${newValue}`,
          }))
        );
      }

      // Use none() when no effects are needed (or just return empty array)
      const finalEffects = effects.length > 0 ? effects : [none()];

      return stay({ ...state, value: newValue }, monitorReducer, finalEffects);
    }
    return stay(state, monitorReducer);
  };

  let state: State = { value: 0, threshold: 100 };

  const process = (msg: Msg) => {
    const result = monitorReducer(state, msg);
    state = result.state;
    executeEffects(result.effects);
  };

  console.log('Monitoring values:');
  process(createMessage('update', { value: 50 }));   // OK
  process(createMessage('update', { value: 150 }));  // Exceeds threshold
  process(createMessage('update', { value: -10 }));  // Negative
  process(createMessage('update', { value: 75 }));   // OK

  console.log('Alerts generated:', alerts);
}

// Example 7: Effect Execution Order
console.log('\n=== Example 7: Effect Execution Order ===');
{
  type Msg = MessageOf<'step', { number: number }>;

  const order: number[] = [];
  const cap = createCapability<Msg>((msg) => {
    order.push(msg.number);
    console.log(`  Executed step ${msg.number}`);
  });

  // Effects are executed in order
  const effects = [
    emitTo(cap, createMessage('step', { number: 1 })),
    batch([
      emitTo(cap, createMessage('step', { number: 2 })),
      emitTo(cap, createMessage('step', { number: 3 })),
    ]),
    emitTo(cap, createMessage('step', { number: 4 })),
    batch([
      batch([
        emitTo(cap, createMessage('step', { number: 5 })),
      ]),
      emitTo(cap, createMessage('step', { number: 6 })),
    ]),
  ];

  console.log('Executing effects in order:');
  executeEffects(effects);

  console.log('Execution order:', order);
  console.log('Order preserved:', JSON.stringify(order) === JSON.stringify([1, 2, 3, 4, 5, 6]));
}

console.log('\n=== All Effect Examples Complete ===');
