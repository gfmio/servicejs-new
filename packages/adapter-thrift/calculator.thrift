namespace js calculator

/**
 * Exception for division by zero
 */
exception DivisionByZero {
  1: string message
}

/**
 * Simple calculator service
 */
service Calculator {
  /**
   * Add two numbers
   */
  i32 add(1: i32 a, 2: i32 b)

  /**
   * Subtract two numbers
   */
  i32 subtract(1: i32 a, 2: i32 b)

  /**
   * Multiply two numbers
   */
  i32 multiply(1: i32 a, 2: i32 b)

  /**
   * Divide two numbers
   */
  i32 divide(1: i32 a, 2: i32 b) throws (1: DivisionByZero error)

  /**
   * Ping the service
   */
  string ping()
}
