/** Framework-free API error so services stay unit-testable. */
export class ApiError extends Error {
  status: number
  /** Optional machine-readable context (limit reached, feature gate, …). */
  details?: Record<string, unknown>

  constructor(message: string, status = 400, details?: Record<string, unknown>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}
