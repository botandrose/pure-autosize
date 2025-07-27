import { expect } from '@esm-bundle/chai'

/**
 * Retry utility for async assertions
 * Retries an assertion function until it passes or times out
 */
export async function retryAssertion(assertionFn, timeout = 2000, interval = 50) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      await assertionFn()
      return; // Success!
    } catch (error) {
      // If we've exceeded the timeout, throw the last error
      if (Date.now() - startTime >= timeout) {
        throw error
      }
      // Otherwise wait and try again
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }
}


/**
 * General change matchers - exported but used internally by height-specific helpers
 */

// Positive change matcher - assert that values DO change
export function expectToChange(getFn, options = {}) {
  const initialValue = getFn()

  return {
    when: async (actionFn) => {
      await actionFn()

      // Retry the assertion until it passes or times out
      await retryAssertion(() => {
        const finalValue = getFn()

        if (options.from !== undefined) {
          expect(initialValue, `Expected initial value to be ${options.from}`).to.equal(options.from)
        }

        if (options.to !== undefined) {
          expect(finalValue, `Expected final value to be ${options.to}`).to.equal(options.to)
        }

        if (options.by !== undefined) {
          const actualChange = finalValue - initialValue
          expect(actualChange, `Expected change by ${options.by}, but got ${actualChange}`).to.equal(options.by)
        }

        if (options.to === undefined && options.by === undefined) {
          // Default: just expect any change
          expect(finalValue, `Expected value to change from ${initialValue}`).to.not.equal(initialValue)
        }
      })

      return getFn()
    }
  }
}

// Negative change matcher - assert that values DON'T change
export function expectNotToChange(getFn, options = {}) {
  const initialValue = getFn()

  return {
    when: async (actionFn) => {
      await actionFn()

      // For negative assertions, we wait a bit to ensure the value doesn't change
      await retryAssertion(() => {
        const finalValue = getFn()

        if (options.from !== undefined) {
          expect(initialValue, `Expected initial value to be ${options.from}`).to.equal(options.from)
        }

        // Assert no change occurred
        expect(finalValue, `Expected value NOT to change from ${initialValue}, but it changed to ${finalValue}`).to.equal(initialValue)
      })

      return getFn()
    }
  }
}

/**
 * Height-specific helpers for cleaner textarea height testing
 *
 * Usage:
 * await expectHeightToIncrease(textarea).when(async () => {
 *   // action that should increase height
 * })
 *
 * await expectHeightNotToChange(textarea).when(async () => {
 *   // action that should not change height
 * })
 */

// Height-specific helper for general height changes
export function expectHeightToChange(element, options = {}) {
  return expectToChange(() => element.offsetHeight, options)
}

// Helper for testing height increases
export function expectHeightToIncrease(element) {
  const initialHeight = element.offsetHeight
  return {
    when: async (actionFn) => {
      await actionFn()

      // Retry until height increases or timeout
      await retryAssertion(() => {
        const finalHeight = element.offsetHeight
        expect(finalHeight, `Expected height to increase from ${initialHeight}, but got ${finalHeight}`).to.be.greaterThan(initialHeight)
      })

      return element.offsetHeight
    }
  }
}

// Helper for testing height decreases
export function expectHeightToDecrease(element) {
  const initialHeight = element.offsetHeight
  return {
    when: async (actionFn) => {
      await actionFn()

      // Retry until height decreases or timeout
      await retryAssertion(() => {
        const finalHeight = element.offsetHeight
        expect(finalHeight, `Expected height to decrease from ${initialHeight}, but got ${finalHeight}`).to.be.lessThan(initialHeight)
      })

      return element.offsetHeight
    }
  }
}

// Helper for testing no height change
export function expectHeightNotToChange(element) {
  return expectNotToChange(() => element.offsetHeight)
}

// Global test setup state
let currentTestTextareas = []

/**
 * Global test setup hooks - call these once in your test file
 */
export function setupGlobalTestHooks() {
  beforeEach(() => {
    // Clean up any existing stylesheets
    document.adoptedStyleSheets = []
    currentTestTextareas = []
  })

  afterEach(() => {
    // Clean up all textareas created during this test
    currentTestTextareas.forEach(textarea => {
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea)
      }
    })
    currentTestTextareas = []
    document.adoptedStyleSheets = []
  })
}

/**
 * Create and setup a textarea, returns the textarea element directly
 *
 * Usage:
 * const textarea = await setupTextarea('<textarea autosize></textarea>')
 * const textarea = await setupTextarea('<textarea autosize>Some content</textarea>')
 * const textarea = await setupTextarea('<textarea autosize="lazy" style="position: absolute; top: 2000px;"></textarea>')
 */
export async function setupTextarea(html, options = {}) {
  document.body.innerHTML = html
  const textarea = document.querySelector('textarea')

  // Apply standard test styling unless explicitly overridden
  if (!textarea.style.width) textarea.style.width = '200px'
  if (!textarea.style.fontSize) textarea.style.fontSize = '14px'
  if (!textarea.style.lineHeight) textarea.style.lineHeight = '20px'
  if (!textarea.style.padding) textarea.style.padding = '8px'
  if (!textarea.style.border) textarea.style.border = '1px solid #ccc'
  if (!textarea.style.boxSizing) textarea.style.boxSizing = 'border-box'

  // Track this textarea for cleanup
  currentTestTextareas.push(textarea)

  await new Promise(resolve => setTimeout(resolve, 10)) // Wait for auto-initialization
  return textarea
}

/**
 * User interaction simulation helpers
 *
 * Usage:
 * simulateTyping(textarea, 'Hello\nWorld')
 * simulateTyping(textarea, 'New text', { replace: true }); // Select-all-and-type
 */

// Simulate realistic character-by-character typing
export function simulateTyping(element, text, options = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')

  // If replace option is true, start with empty value (simulates select-all-and-type)
  let currentValue = options.replace ? '' : element.value

  // If replacing, first set empty value and fire input event
  if (options.replace) {
    descriptor.set.call(element, '')
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // Then type character by character
  for (let i = 0; i < text.length; i++) {
    currentValue += text[i]
    // Set value using prototype to avoid triggering our override
    descriptor.set.call(element, currentValue)
    // Fire input event for each keystroke (simplified version of real typing)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

// Simulate paste operation (single content change + input event)
export function simulatePaste(element, text) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
  descriptor.set.call(element, text)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

// Simulate backspace deletion (character by character)
export function simulateBackspace(element, charactersToDelete) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
  let currentValue = element.value

  for (let i = 0; i < charactersToDelete; i++) {
    currentValue = currentValue.slice(0, -1)
    descriptor.set.call(element, currentValue)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  }
}
