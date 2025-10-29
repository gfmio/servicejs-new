/**
 * SMS Types for ServiceJS
 *
 * Provides common types and interfaces for SMS adapters.
 * This package defines the contract that all SMS providers must implement.
 */

import type { Result } from '@servicejs/result';

/**
 * SMS message to be sent
 */
export interface SMSMessage {
  /** Recipient phone number (E.164 format recommended) */
  to: string;

  /** Message body */
  body: string;

  /** Sender phone number or ID (optional, may use default from config) */
  from?: string;

  /** Media URLs to attach (MMS) */
  mediaUrls?: string[];
}

/**
 * Response from sending an SMS message
 */
export interface SMSMessageResponse {
  /** Unique message ID from the provider */
  messageId: string;

  /** Whether the message was accepted for delivery */
  success: boolean;

  /** Status of the message (if available) */
  status?: string;

  /** Cost information (if available) */
  cost?: {
    amount: string;
    currency: string;
  };
}

/**
 * Batch send result for a single message
 */
export interface SMSBatchResult {
  /** Whether this message was sent successfully */
  success: boolean;

  /** Message ID if successful */
  messageId?: string;

  /** Error message if failed */
  error?: string;
}

/**
 * Generic SMS adapter interface that all SMS providers must implement
 */
export interface SMSAdapter<TConfig = any> {
  /**
   * Initialize the adapter with provider-specific configuration
   */
  init(config: TConfig): Promise<Result<void, Error>>;

  /**
   * Start the adapter (lifecycle method)
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop the adapter (lifecycle method)
   */
  stop(): Promise<Result<void, Error>>;

  /**
   * Destroy the adapter and cleanup resources
   */
  destroy(): Promise<Result<void, Error>>;

  /**
   * Check adapter health
   */
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  /**
   * Send a single SMS message
   */
  send(message: SMSMessage): Promise<Result<SMSMessageResponse, Error>>;

  /**
   * Send multiple SMS messages in batch
   */
  sendBatch(messages: SMSMessage[]): Promise<Result<SMSBatchResult[], Error>>;
}
