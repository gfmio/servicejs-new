/**
 * Error Message Types
 *
 * Helper types for better compile-time error messages.
 */

/**
 * Generic error message type
 */
export type ErrorMessage<TError extends string, TDetails = unknown> = {
  readonly _error: TError;
  readonly _details: TDetails;
  readonly _message: 'Type-level error - see _error and _details for information';
};

/**
 * Invalid message error - message must have a 'type' field
 */
export type InvalidMessageError<TReceived> = ErrorMessage<
  'Invalid message type',
  {
    received: TReceived;
    hint: 'Message must have a "type" field with string literal type';
    example: { type: 'myMessage'; /* other fields */ };
  }
>;

/**
 * Method not found error - HKTO does not handle this message type
 */
export type MethodNotFoundError<TMessageType extends string, THKTO> = ErrorMessage<
  'Method not found',
  {
    messageType: TMessageType;
    hkto: THKTO;
    hint: 'The HKTO does not have a method that handles this message type';
  }
>;

/**
 * Invalid function HKTF error - must use FunctionHKTF, not raw function types
 */
export type InvalidFunctionError<TReceived> = ErrorMessage<
  'Invalid function type',
  {
    received: TReceived;
    hint: 'Use FunctionHKTF.Fn1<I, O> instead of (x: I) => O';
    example: 'FunctionHKTF.Fn1<number, string>';
  }
>;

/**
 * Invalid HKTF error - must extend HKTF.Base
 */
export type InvalidHKTFError<TReceived> = ErrorMessage<
  'Invalid HKTF',
  {
    received: TReceived;
    hint: 'Type must extend HKTF.Base and define ArgsSymbol and ResultSymbol';
  }
>;

/**
 * Type mismatch error
 */
export type TypeMismatchError<TExpected, TReceived> = ErrorMessage<
  'Type mismatch',
  {
    expected: TExpected;
    received: TReceived;
    hint: 'The provided type does not match the expected type';
  }
>;

/**
 * Empty tuple error - operation requires non-empty tuple
 */
export type EmptyTupleError<TOperation extends string> = ErrorMessage<
  'Empty tuple',
  {
    operation: TOperation;
    hint: 'This operation requires a non-empty tuple';
  }
>;

/**
 * Index out of bounds error
 */
export type IndexOutOfBoundsError<TIndex extends number, TLength extends number> = ErrorMessage<
  'Index out of bounds',
  {
    index: TIndex;
    length: TLength;
    hint: 'The index is outside the bounds of the tuple';
  }
>;

/**
 * Invalid path error - path does not exist in object
 */
export type InvalidPathError<TPath, TObj> = ErrorMessage<
  'Invalid path',
  {
    path: TPath;
    object: TObj;
    hint: 'The path does not exist in the object';
  }
>;

/**
 * Recursion depth error
 */
export type RecursionDepthError<TOperation extends string> = ErrorMessage<
  'Recursion depth exceeded',
  {
    operation: TOperation;
    hint: 'TypeScript has a limit on recursion depth. Try breaking the operation into smaller parts.';
  }
>;
