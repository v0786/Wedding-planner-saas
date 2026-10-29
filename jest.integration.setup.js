process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres@localhost:5432/wedding_guest_manager_test"
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "integration-test-secret-0123456789abcdef"
process.env.AUTH_TRUST_HOST = "true"
