// src/reactivity/index.ts
// Vue-like reactivity system for TypeScript

/**
 * Type for a reactive effect function
 */
export type EffectFn = () => void;

/**
 * Type for a cleanup function that can be registered with an effect
 */
export type CleanupFn = () => void;

/**
 * Interface for a reactive effect
 */
interface ReactiveEffect {
  fn: EffectFn;
  deps: Set<ReactiveEffect>[];
  active: boolean;
  onStop?: () => void;
  cleanup?: CleanupFn;
}

// Global state for the reactivity system
let activeEffect: ReactiveEffect | undefined;
let activeCleanupFn: ((fn: CleanupFn) => void) | undefined;
const targetMap = new WeakMap<object, Map<string | symbol, Set<ReactiveEffect>>>();

/**
 * Track a property access for reactivity
 * @param target Object being accessed
 * @param key Property key
 */
function track(target: object, key: string | symbol): void {
  if (!activeEffect) return;
  
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

/**
 * Register a cleanup function for the active effect or watch context
 */
export function onCleanup(fn: () => void): void {
  if (activeEffect) {
    activeEffect.cleanup = fn;
  } else if (activeCleanupFn) {
    // If we're in a watch context without an active effect
    activeCleanupFn(fn);
  }
}

/**
 * Trigger updates for a property change
 * @param target Object being modified
 * @param key Property key
 */
function trigger(target: object, key: string | symbol): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  
  const effects = new Set<ReactiveEffect>();
  
  // Add effects for the specific key
  const deps = depsMap.get(key);
  if (deps) {
    deps.forEach(effect => {
      if (effect !== activeEffect) {
        effects.add(effect);
      }
    });
  }
  
  // Run all effects
  effects.forEach(effect => {
    try {
      effect.fn();
    } catch (err) {
      // Handle errors in all effects
      console.error('Error in effect:', err);
    }
  });
}

/**
 * Create a reactive effect
 * @param fn Effect function
 * @param options Effect options
 * @returns Stop function
 */
export function effect(fn: EffectFn, options: { lazy?: boolean, onStop?: () => void } = {}): () => void {
  const _effect: ReactiveEffect = {
    fn,
    deps: [],
    active: true,
    onStop: options.onStop
  };
  
  if (!options.lazy) {
    _run(_effect);
  }
  // TODO: Test coverage - Add test for lazy option in effect
  
  // Create a runner function that will execute the effect and return its result
  const runner = () => {
    if (!_effect.active) return undefined;
    return _run(_effect); // This should return whatever the effect function returns
  };
  
  runner.effect = _effect;
  
  return () => {
    if (_effect.active) {
      _cleanup(_effect);
      if (_effect.onStop) {
        // TODO: Test coverage - Add test for onStop callback
        _effect.onStop();
      }
      _effect.active = false;
    }
    // TODO: Test coverage - Add test for stopping an already stopped effect
  };
}

/**
 * Run an effect
 * @param effect Effect to run
 * @returns Result of the effect function
 */
function _run(effect: ReactiveEffect): any {
  if (!effect.active) return;
  
  // Clean up old dependencies
  _cleanup(effect);
  
  // Set the current active effect
  const oldActiveEffect = activeEffect;
  activeEffect = effect;
  
  // Run the effect function
  const result = effect.fn();
  
  // Reset the active effect
  activeEffect = oldActiveEffect;
  
  return result;
}

/**
 * Clean up an effect's dependencies
 * @param effect Effect to clean up
 */
function _cleanup(effect: ReactiveEffect): void {
  const { deps } = effect;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0;
  }
}

/**
 * Create a reactive proxy for an object
 * @param target Object to make reactive
 * @returns Reactive proxy
 */
export function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      
      // Track the property access
      track(target, key);
      
      // If the result is an object, make it reactive too
      if (result && typeof result === 'object') {
        return reactive(result);
      }
      
      return result;
    },
    
    set(target, key, value, receiver) {
      const oldValue = (target as any)[key];
      const result = Reflect.set(target, key, value, receiver);
      
      // Only trigger if the value actually changed
      if (oldValue !== value) {
        trigger(target, key);
      }
      
      return result;
    },
    
    deleteProperty(target, key) {
      const hadKey = key in target;
      // Delete the property
      const result = Reflect.deleteProperty(target, key);
      
      // Only trigger if the property existed
      if (hadKey) {
        trigger(target, key);
      }
      
      return result;
    }
  });
}

/**
 * Create a ref object for a primitive value
 * @param value Initial value
 * @returns Ref object
 */
export function ref<T>(value: T): { value: T } {
  const refObject = {
    get value() {
      track(refObject, 'value');
      return value;
    },
    set value(newValue: T) {
      if (value !== newValue) {
        // Store old value in variable not used directly but helpful for debugging
        value = newValue;
        trigger(refObject, 'value');
      }
    }
  };
  
  return refObject;
}

/**
 * Create a computed property
 * @param getter Getter function
 * @returns Computed ref
 */
export function computed<T>(getter: () => T): { readonly value: T } {
  const result = ref<T>(undefined as any);
  
  effect(() => {
    result.value = getter();
  });
  
  return { get value() { return result.value; } };
}

/**
 * Create a watcher
 * @param source Source to watch
 * @param callback Callback function
 * @param options Watcher options
 * @returns Stop function
 */
export function watch<T>(
  source: () => T,
  callback: (newValue: T, oldValue: T | undefined) => void,
  options: { immediate?: boolean } = {}
): () => void {
  let oldValue: T | undefined;
  let cleanup: CleanupFn | undefined;
  
  // Function to register cleanup logic that will run before the next callback execution
  const registerCleanup = (fn: CleanupFn) => {
    cleanup = fn;
  };
  
  // Store the onCleanup function for internal use
  // Make it available to the current effect through the global onCleanup function
  activeCleanupFn = registerCleanup;
  const job = () => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
    
    const newValue = source();
    // Only pass the required parameters to maintain backward compatibility
    callback(newValue, oldValue);
    oldValue = newValue;
  };
  
  const stop = effect(() => {
    const newValue = source();
    if (options.immediate || oldValue !== undefined) {
      job();
    } else {
      oldValue = newValue;
    }
  });
  
  return stop;
}
