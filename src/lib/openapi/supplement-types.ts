/**
 * @module Build-time only
 *
 * Type definitions for endpoint supplement data objects.
 * Supplements provide human-authored metadata (tags, summary, description,
 * security, examples) that gets merged onto auto-inferred schemas.
 */

export interface EndpointSupplement {
  additionalResponses?: Record<number, { description: string }>;
  description?: string;
  method: string;
  parameterExamples?: Record<
    string,
    Record<string, { description?: string; summary?: string; value: unknown }>
  >;
  path: string;
  requestExample?: Record<string, unknown>;
  requestExamples?: Record<string, { description?: string; summary?: string; value: unknown }>;
  response400Example?: Record<string, unknown>;
  response400Examples?: Record<string, { description?: string; summary?: string; value: unknown }>;
  responseExample?: Record<string, unknown>;
  responseExamples?: Record<string, { description?: string; summary?: string; value: unknown }>;
  security?: Record<string, string[]>[];
  summary?: string;
  tags?: string[];
}
