/**
 * Unified HKT System: Stateless Dispatchers with Closure-based State
 * 
 * Core insight: 
 * - HKTOs are pure message dispatchers (no stored state)
 * - State is implicitly captured when the HKTO is constructed
 * - All functions are HKTFs, no raw function types
 * - HKTOs are built using tuple-based combine utility
 */

// ============================================================================
// Core HKTF (Higher-Kinded Type Functions)
// ============================================================================

export namespace HKTF {
  /**
   * Unique symbols for HKTF properties
   */
  export declare const ArgsSymbol: unique symbol;
  export declare const DefaultsSymbol: unique symbol;
  export declare const ResultSymbol: unique symbol;
  
  /**
   * Base interface for type-level functions
   */
  export interface Base {
    [ArgsSymbol]: unknown;
    [DefaultsSymbol]?: unknown;
    [ResultSymbol]: unknown;
  }
  
  /**
   * Extract merged args (defaults + provided)
   */
  export type Args<F extends Base> = F extends { [DefaultsSymbol]: infer D }
    ? F[typeof ArgsSymbol] & D
    : F[typeof ArgsSymbol];
  
  /**
   * Partial application - updates/overwrites defaults
   */
  export type PartialApply<F extends Base, NewDefaults> = 
    F & { 
      [DefaultsSymbol]: F extends { [DefaultsSymbol]: infer D } 
        ? D & NewDefaults 
        : NewDefaults 
    };
  
  /**
   * Extract the result type
   */
  export type Result<F extends Base> = F[typeof ResultSymbol];
  
  /**
   * Apply a type-level function
   */
  export type Apply<F extends Base, Input extends Partial<F[typeof ArgsSymbol]>> = 
    Result<PartialApply<F, Input>>;
}

// ============================================================================
// Function Types as HKTFs (no raw functions!)
// ============================================================================

export namespace FunctionHKTF {
  export interface Fn1<I = unknown, O = unknown> extends HKTF.Base {
    [HKTF.ArgsSymbol]: { input: I };
    [HKTF.ResultSymbol]: O;
  }
  
  export interface Fn2<I1 = unknown, I2 = unknown, O = unknown> extends HKTF.Base {
    [HKTF.ArgsSymbol]: { first: I1; second: I2 };
    [HKTF.ResultSymbol]: O;
  }
  
  export interface Predicate<T = unknown> extends Fn1<T, boolean> {}
  
  export interface Reducer<Acc = unknown, Val = unknown> extends HKTF.Base {
    [HKTF.ArgsSymbol]: { accumulator: Acc; value: Val };
    [HKTF.ResultSymbol]: Acc;
  }
}

// ============================================================================
// Method HKTF Pattern (adapted for closure-based state)
// ============================================================================

export namespace Method {
  /**
   * Method HKTFs now take just the message (state is in closure)
   */
  export interface Base<Message = unknown, Result = unknown> extends HKTF.Base {
    [HKTF.ArgsSymbol]: Message;
    [HKTF.ResultSymbol]: Result;
  }
  
  /**
   * Extract the message type from a method
   */
  export type MessageOf<M extends Base> = M[typeof HKTF.ArgsSymbol];
}

// ============================================================================
// Core HKTO - Pure Message Dispatchers with Tuple Combine
// ============================================================================

export namespace HKTO {
  /**
   * Symbol for methods tuple
   */
  export declare const MethodsSymbol: unique symbol;
  
  /**
   * HKTOs are message dispatchers built from method tuples
   */
  export interface Base extends HKTF.Base {
    [HKTF.ArgsSymbol]: unknown;     // Accepted message types
    [HKTF.ResultSymbol]: unknown;   // Result based on message
    [MethodsSymbol]: readonly Method.Base[]; // Tuple of methods
  }
  
  /**
   * Send a message to an HKTO - dispatches to methods
   */
  export type Send<O extends Base, Message extends O[typeof HKTF.ArgsSymbol]> = 
    SendToMethods<O[typeof MethodsSymbol], Message>;
  
  /**
   * Helper: Send message to a tuple of methods
   */
  type SendToMethods<
    Methods extends readonly Method.Base[],
    Message
  > = Methods extends readonly []
    ? never
    : Methods extends readonly [infer M, ...infer Rest]
      ? M extends Method.Base
        ? Message extends Method.MessageOf<M>
          ? HKTF.Apply<M, Message>
          : Rest extends readonly Method.Base[]
            ? SendToMethods<Rest, Message>
            : never
        : never
      : never;
  
  /**
   * Combine method HKTFs into an HKTO using a tuple
   */
  export interface Combine<
    Methods extends readonly Method.Base[]
  > extends Base {
    [HKTF.ArgsSymbol]: ExtractMessages<Methods>;
    [HKTF.ResultSymbol]: Send<this, HKTF.Args<this>>;
    [MethodsSymbol]: Methods;
  }
  
  /**
   * Extract all message types from a tuple of methods
   */
  export type ExtractMessages<Methods extends readonly Method.Base[]> = 
    Methods extends readonly []
      ? never
      : Methods extends readonly [infer M, ...infer Rest]
        ? M extends Method.Base
          ? Rest extends readonly Method.Base[]
            ? Method.MessageOf<M> | ExtractMessages<Rest>
            : Method.MessageOf<M>
          : never
        : never;
}

// ============================================================================
// Stateless Math Functions as HKTFs
// ============================================================================

export namespace Math {
  // Add HKTF
  export interface AddArgs {
    type: "add";
    a: number;
    b: number;
  }
  
  export interface Add extends Method.Base<AddArgs, number> {}
  
  // Subtract HKTF
  export interface SubArgs {
    type: "sub";
    a: number;
    b: number;
  }
  
  export interface Sub extends Method.Base<SubArgs, number> {}
  
  // Multiply HKTF
  export interface MulArgs {
    type: "mul";
    a: number;
    b: number;
  }
  
  export interface Mul extends Method.Base<MulArgs, number> {}
  
  // Divide HKTF
  export interface DivArgs {
    type: "div";
    a: number;
    b: number;
  }
  
  export interface Div extends Method.Base<DivArgs, number> {}
  
  // BasicMath dispatcher - combines all math operations using tuple
  export interface BasicMath extends HKTO.Combine<
    readonly [Add, Sub, Mul, Div]
  > {}
}

// ============================================================================
// Stateful Calculator - State captured in closure
// ============================================================================

export namespace Calculator {
  // Calculator Add method (closure captures Value)
  export interface CalculatorAdd<Value extends number> extends Method.Base<
    { type: "calculatorAdd"; b: number },
    CalculatorHKTO<number>  // Would be Value + b
  > {}
  
  // Calculator Sub method
  export interface CalculatorSub<Value extends number> extends Method.Base<
    { type: "calculatorSub"; b: number },
    CalculatorHKTO<number>  // Would be Value - b
  > {}
  
  // Calculator Mul method
  export interface CalculatorMul<Value extends number> extends Method.Base<
    { type: "calculatorMul"; b: number },
    CalculatorHKTO<number>  // Would be Value * b
  > {}
  
  // Calculator Div method
  export interface CalculatorDiv<Value extends number> extends Method.Base<
    { type: "calculatorDiv"; b: number },
    CalculatorHKTO<number>  // Would be Value / b
  > {}
  
  // Calculator Set method
  export interface CalculatorSet<Value extends number> extends Method.Base<
    { type: "calculatorSet"; value: number },
    unknown
  > {
    [HKTF.ResultSymbol]: CalculatorHKTO<HKTF.Args<this>["value"]>;
  }
  
  // Calculator Get method
  export interface CalculatorGet<Value extends number> extends Method.Base<
    { type: "calculatorGet" },
    Value
  > {}
  
  /**
   * Calculator HKTO - combines methods using tuple
   * Value is captured in the type parameter (closure)
   */
  export interface CalculatorHKTO<Value extends number = 0> extends HKTO.Combine<
    readonly [
      CalculatorAdd<Value>,
      CalculatorSub<Value>,
      CalculatorMul<Value>,
      CalculatorDiv<Value>,
      CalculatorSet<Value>,
      CalculatorGet<Value>
    ]
  > {}
  
  /**
   * MakeCalculator constructor - creates closure
   */
  export interface MakeCalculator extends HKTF.Base {
    [HKTF.ArgsSymbol]: { value: number };
    [HKTF.ResultSymbol]: CalculatorHKTO<HKTF.Args<this>["value"]>;
  }
}

// ============================================================================
// Option as Stateless Dispatchers with HKTFs
// ============================================================================

export namespace Option {
  // Some Map method
  export interface SomeMap<T> extends Method.Base<
    { type: "map"; fn: FunctionHKTF.Fn1<T, unknown> },
    unknown
  > {
    [HKTF.ResultSymbol]: HKTF.Args<this>["fn"] extends FunctionHKTF.Fn1<T, infer R>
      ? SomeHKTO<R>
      : never;
  }
  
  // Some FlatMap method
  export interface SomeFlatMap<T> extends Method.Base<
    { type: "flatMap"; fn: FunctionHKTF.Fn1<T, OptionHKTO<unknown>> },
    unknown
  > {
    [HKTF.ResultSymbol]: HKTF.Args<this>["fn"] extends FunctionHKTF.Fn1<T, infer R>
      ? R
      : never;
  }
  
  // Some Filter method
  export interface SomeFilter<T> extends Method.Base<
    { type: "filter"; predicate: FunctionHKTF.Predicate<T> },
    OptionHKTO<T>
  > {}
  
  // Some GetOrElse method
  export interface SomeGetOrElse<T> extends Method.Base<
    { type: "getOrElse"; default: unknown },
    T
  > {}
  
  // Some Get method
  export interface SomeGet<T> extends Method.Base<
    { type: "get" },
    T
  > {}
  
  /**
   * Some HKTO - value captured in type parameter
   */
  export interface SomeHKTO<T> extends HKTO.Combine<
    readonly [
      SomeMap<T>,
      SomeFlatMap<T>,
      SomeFilter<T>,
      SomeGetOrElse<T>,
      SomeGet<T>
    ]
  > {}
  
  // None methods
  export interface NoneMap extends Method.Base<
    { type: "map"; fn: FunctionHKTF.Fn1<never, unknown> },
    NoneHKTO
  > {}
  
  export interface NoneFlatMap extends Method.Base<
    { type: "flatMap"; fn: FunctionHKTF.Fn1<never, unknown> },
    NoneHKTO
  > {}
  
  export interface NoneFilter extends Method.Base<
    { type: "filter"; predicate: FunctionHKTF.Predicate<never> },
    NoneHKTO
  > {}
  
  export interface NoneGetOrElse extends Method.Base<
    { type: "getOrElse"; default: unknown },
    unknown
  > {
    [HKTF.ResultSymbol]: HKTF.Args<this>["default"];
  }
  
  export interface NoneGet extends Method.Base<
    { type: "get" },
    never
  > {}
  
  /**
   * None HKTO - no value to capture
   */
  export interface NoneHKTO extends HKTO.Combine<
    readonly [
      NoneMap,
      NoneFlatMap,
      NoneFilter,
      NoneGetOrElse,
      NoneGet
    ]
  > {}
  
  export type OptionHKTO<T> = SomeHKTO<T> | NoneHKTO;
  
  /**
   * Constructors
   */
  export interface Some extends HKTF.Base {
    [HKTF.ArgsSymbol]: { value: unknown };
    [HKTF.ResultSymbol]: SomeHKTO<HKTF.Args<this>["value"]>;
  }
  
  export interface None extends HKTF.Base {
    [HKTF.ArgsSymbol]: {};
    [HKTF.ResultSymbol]: NoneHKTO;
  }
}

// ============================================================================
// List as Stateless Dispatchers with HKTFs
// ============================================================================

export namespace List {
  // Cons Map method
  export interface ConsMap<Head, Tail> extends Method.Base<
    { type: "map"; fn: FunctionHKTF.Fn1<Head, unknown> },
    unknown
  > {
    [HKTF.ResultSymbol]: HKTF.Args<this>["fn"] extends FunctionHKTF.Fn1<Head, infer R>
      ? ConsHKTO<R, any>  // Would need to map tail too
      : never;
  }
  
  // Cons Head method
  export interface ConsHead<Head, Tail> extends Method.Base<
    { type: "head" },
    Head
  > {}
  
  // Cons Tail method
  export interface ConsTail<Head, Tail> extends Method.Base<
    { type: "tail" },
    Tail
  > {}
  
  /**
   * Cons HKTO - head and tail captured in type parameters
   */
  export interface ConsHKTO<Head, Tail extends ListHKTO<Head>> extends HKTO.Combine<
    readonly [
      ConsMap<Head, Tail>,
      ConsHead<Head, Tail>,
      ConsTail<Head, Tail>
    ]
  > {}
  
  // Nil methods
  export interface NilMap extends Method.Base<
    { type: "map"; fn: FunctionHKTF.Fn1<never, unknown> },
    NilHKTO
  > {}
  
  export interface NilHead extends Method.Base<
    { type: "head" },
    never
  > {}
  
  export interface NilTail extends Method.Base<
    { type: "tail" },
    NilHKTO
  > {}
  
  /**
   * Nil HKTO - empty list
   */
  export interface NilHKTO extends HKTO.Combine<
    readonly [NilMap, NilHead, NilTail]
  > {}
  
  export type ListHKTO<T> = ConsHKTO<T, ListHKTO<T>> | NilHKTO;
  
  /**
   * Constructors
   */
  export interface Cons extends HKTF.Base {
    [HKTF.ArgsSymbol]: { head: unknown; tail: ListHKTO<unknown> };
    [HKTF.ResultSymbol]: ConsHKTO<
      HKTF.Args<this>["head"],
      HKTF.Args<this>["tail"]
    >;
  }
  
  export interface Nil extends HKTF.Base {
    [HKTF.ArgsSymbol]: {};
    [HKTF.ResultSymbol]: NilHKTO;
  }
}

// ============================================================================
// State Monad with HKTFs
// ============================================================================

export namespace State {
  // State Run method
  export interface StateRun<S, A> extends Method.Base<
    { type: "run"; initialState: S },
    [A, S]
  > {}
  
  // State Map method
  export interface StateMap<S, A> extends Method.Base<
    { type: "map"; fn: FunctionHKTF.Fn1<A, unknown> },
    unknown
  > {
    [HKTF.ResultSymbol]: HKTF.Args<this>["fn"] extends FunctionHKTF.Fn1<A, infer B>
      ? StateHKTO<S, B>
      : never;
  }
  
  // State FlatMap method
  export interface StateFlatMap<S, A> extends Method.Base<
    { type: "flatMap"; fn: FunctionHKTF.Fn1<A, StateHKTO<S, unknown>> },
    unknown
  > {
    [HKTF.ResultSymbol]: HKTF.Args<this>["fn"] extends FunctionHKTF.Fn1<A, infer Result>
      ? Result
      : never;
  }
  
  /**
   * State HKTO - computation captured in type parameters
   */
  export interface StateHKTO<S, A> extends HKTO.Combine<
    readonly [
      StateRun<S, A>,
      StateMap<S, A>,
      StateFlatMap<S, A>
    ]
  > {}
  
  /**
   * Constructors
   */
  export interface Pure extends HKTF.Base {
    [HKTF.ArgsSymbol]: { value: unknown };
    [HKTF.ResultSymbol]: StateHKTO<unknown, HKTF.Args<this>["value"]>;
  }
  
  export interface Get extends HKTF.Base {
    [HKTF.ArgsSymbol]: {};
    [HKTF.ResultSymbol]: StateHKTO<unknown, unknown>;  // StateHKTO<S, S>
  }
  
  export interface Put extends HKTF.Base {
    [HKTF.ArgsSymbol]: { state: unknown };
    [HKTF.ResultSymbol]: StateHKTO<HKTF.Args<this>["state"], void>;
  }
  
  export interface Modify extends HKTF.Base {
    [HKTF.ArgsSymbol]: { fn: FunctionHKTF.Fn1<unknown, unknown> };
    [HKTF.ResultSymbol]: StateHKTO<unknown, void>;
  }
}

// ============================================================================
// Custom Stack Example with Tuple Combine
// ============================================================================

export namespace Stack {
  // Push method
  export interface Push<T, Items extends T[]> extends Method.Base<
    { element: T },
    StackHKTO<T, [T, ...Items]>
  > {}
  
  // Pop method
  export interface Pop<T, Items extends T[]> extends Method.Base<
    { pop: true },
    Items extends readonly [infer Head, ...infer Tail]
      ? { value: Head; stack: StackHKTO<T, Tail> }
      : { value: undefined; stack: StackHKTO<T, []> }
  > {}
  
  // Peek method
  export interface Peek<T, Items extends T[]> extends Method.Base<
    { peek: true },
    Items extends readonly [infer Head, ...any] ? Head : undefined
  > {}
  
  // IsEmpty method
  export interface IsEmpty<T, Items extends T[]> extends Method.Base<
    { isEmpty: true },
    Items extends readonly [] ? true : false
  > {}
  
  /**
   * Stack HKTO - items captured in type parameter
   */
  export interface StackHKTO<T, Items extends T[] = []> extends HKTO.Combine<
    readonly [
      Push<T, Items>,
      Pop<T, Items>,
      Peek<T, Items>,
      IsEmpty<T, Items>
    ]
  > {}
  
  /**
   * Constructor
   */
  export interface MakeStack extends HKTF.Base {
    [HKTF.ArgsSymbol]: { items?: unknown[] };
    [HKTF.DefaultsSymbol]: { items: [] };
    [HKTF.ResultSymbol]: StackHKTO<any, HKTF.Args<this>["items"]>;
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

export namespace Examples {
  // Math with tuple-based combine
  export namespace MathExample {
    type Sum = HKTO.Send<Math.BasicMath, { type: "add"; a: 3; b: 5 }>;
    type Diff = HKTO.Send<Math.BasicMath, { type: "sub"; a: 10; b: 3 }>;
  }
  
  // Calculator with closure-based state
  export namespace CalculatorExample {
    type Calc = HKTF.Apply<Calculator.MakeCalculator, { value: 10 }>;
    type Calc1 = HKTO.Send<Calc, { type: "calculatorAdd"; b: 5 }>;
    type Calc2 = HKTO.Send<Calc1, { type: "calculatorMul"; b: 2 }>;
    type Value = HKTO.Send<Calc2, { type: "calculatorGet" }>;
  }
  
  // Option with HKTFs
  export namespace OptionExample {
    type MySome = HKTF.Apply<Option.Some, { value: 42 }>;
    
    // Map with HKTF function
    type Doubled = HKTO.Send<MySome, {
      type: "map";
      fn: { [HKTF.ArgsSymbol]: { input: 42 }; [HKTF.ResultSymbol]: 84 }
    }>;
    
    type MyNone = HKTF.Apply<Option.None, {}>;
    type DefaultValue = HKTO.Send<MyNone, {
      type: "getOrElse";
      default: 100
    }>;
  }
  
  // Stack with tuple combine
  export namespace StackExample {
    type S0 = HKTF.Apply<Stack.MakeStack, {}>;
    type S1 = HKTO.Send<S0, { element: 1 }>;
    type S2 = HKTO.Send<S1, { element: 2 }>;
    type S3 = HKTO.Send<S2, { element: 3 }>;
    
    type Top = HKTO.Send<S3, { peek: true }>;
    type Popped = HKTO.Send<S3, { pop: true }>;
    type Empty = HKTO.Send<S0, { isEmpty: true }>;
  }
}

// ============================================================================
// Key Insights - Final Design
// ============================================================================

/**
 * 1. PURE DISPATCHERS WITH TUPLES:
 *    - HKTOs are built using HKTO.Combine with tuples
 *    - No explicit state storage
 *    - Methods are collected in tuples
 * 
 * 2. ALL FUNCTIONS ARE HKTFs:
 *    - No raw function types anywhere
 *    - FunctionHKTF.Fn1, Predicate, Reducer, etc.
 *    - Maintains type-level purity
 * 
 * 3. CLOSURE-BASED STATE:
 *    - State captured in type parameters
 *    - CalculatorHKTO<10> captures value 10
 *    - SomeHKTO<T> captures value T
 * 
 * 4. METHOD PATTERN:
 *    - Each method is Method.Base<Message, Result>
 *    - Methods don't need state parameter (it's in closure)
 *    - Clean and simple
 * 
 * 5. TUPLE COMBINE:
 *    - HKTO.Combine takes a tuple of methods
 *    - Automatically extracts message types
 *    - Dispatches to matching method
 * 
 * This is the cleanest design:
 * - Stateless dispatchers
 * - Closure-based state
 * - HKTFs everywhere
 * - Tuple-based composition
 */
