# Pure Autosize Testing Guide

This guide outlines how to test Pure Autosize, focusing on running tests across multiple browsers to ensure compatibility with Chrome 73+, Firefox 101+, and Safari 16.4+.

## Prerequisites

1. Ensure you have a currently supported Node.js and npm installed.
2. Install dependencies by running:
   ```bash
   npm install
   npx playwright install
   ```

## Running All Tests

To run all tests in headless mode using the default browser (Chrome), execute:
```bash
npm test
```

To run all tests against all supported browsers in headless mode, execute:
```bash
npm run test:all
```
This will run the tests using Playwright's headless browser setup across Chrome, Firefox, and WebKit (Safari-adjacent).

## Running Tests on Specific Browsers

To run tests against a specific browser, execute:
```bash
npm run test:chrome    # Test on Chromium
npm run test:firefox   # Test on Firefox
npm run test:webkit    # Test on WebKit (Safari-adjacent)
```

## Running Tests for CI/CD

To run tests with quality checks (prevents `it.only` in production), execute:
```bash
npm run test:ci
```
This runs all browsers with the `--fail-only` flag to catch development-only test configurations.

## Code Coverage

To run coverage analysis, execute:
```bash
npm run test:coverage
```
After a test run completes, you can open `coverage/lcov-report/index.html` to view the detailed code coverage report.

## Test Development

### Running Tests in Watch Mode
For development, use:
```bash
npm run test:watch
```
This will automatically re-run tests when files change.

### Quality Checks
- Never commit tests with `it.only()` - the CI will fail
- Maintain test coverage above 95%
- All tests must pass on Chrome, Firefox, and WebKit

## GitHub Actions CI

On each push and pull request, GitHub Actions automatically runs:

1. **Cross-browser testing**: Tests on Chromium, Firefox, and WebKit
2. **Quality checks**: Fails if `it.only` is found in test files
3. **Coverage validation**: Ensures coverage meets minimum threshold

### Local CI Simulation
You can run `npm run test:ci` to locally simulate the CI environment and catch issues before pushing.

## Browser Support

This library is tested and supported on:
- **Chrome 73+** (March 2019)
- **Firefox 101+** (May 2022)
- **Safari 16.4+** (March 2023)

Tests use Playwright to verify functionality across these browser engines.

## Test Architecture

Tests are located in the `test/` directory and use:
- **@web/test-runner** for test execution
- **@esm-bundle/chai** for assertions
- **Custom test helpers** for textarea setup and behavior validation
- **Playwright** for cross-browser testing

The test suite covers:
- User input events (typing, pasting, backspace)
- Programmatic value changes (for DOM morphing scenarios)
- Window resize handling
- Form reset functionality
- Lazy loading with IntersectionObserver
- Dynamic textarea management
- Cross-browser compatibility
