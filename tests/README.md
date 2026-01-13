# Kala Test Suite

## Overview

This directory contains automated tests for the Kala browser extension.

## Test Structure

- `setup.ts` - Test environment setup and Chrome API mocks
- `delay-calculator.test.ts` - Tests for delay calculation logic
- `event-queue.test.ts` - Tests for event queue ordering
- `statistics-manager.test.ts` - Tests for statistics tracking

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- delay-calculator.test.ts
```

## Test Coverage

Current test coverage includes:
- ✅ Delay calculator (privacy levels, context detection)
- ✅ Event queue (ordering, timing)
- ✅ Statistics manager (tracking, persistence)

## Adding New Tests

When adding new features, create corresponding test files:
- `tests/[feature-name].test.ts`
- Follow existing test patterns
- Mock Chrome APIs in `setup.ts` if needed

## Continuous Integration

Tests are designed to run in CI environments:
- No browser required (uses jsdom)
- Chrome APIs are mocked
- Fast execution (< 5 seconds)

