/**
 * Morphing-Resistant Autosize
 *
 * A declarative, framework-agnostic library for automatically resizing textareas
 * that survives DOM morphing operations (Turbo, idiomorph, etc.)
 *
 * Usage:
 *   <textarea autosize></textarea>
 *   <textarea autosize="lazy"></textarea>
 *
 * Features:
 * - No style attribute conflicts with morphing
 * - Detects content changes via value property override
 * - Handles form resets, window resizing, and dynamic elements
 * - Lazy loading support for performance
 */

class StylesheetManager {
  constructor(textarea) {
    this.textarea = textarea
    this.stylesheet = new CSSStyleSheet()

    // Ensure textarea has an ID for CSS targeting
    if (!textarea.id) {
      textarea.id = 'autosize-' + Math.random().toString(36).substr(2, 9)
    }

    document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.stylesheet]
  }

  setHeight(height, extraRules = '') {
    if (height === '') {
      this.stylesheet.replaceSync('')
    } else {
      const baseRules = `height: ${height} !important; overflow-x: hidden !important; word-wrap: break-word !important;`
      const css = `#${this.textarea.id} { ${baseRules} ${extraRules} }`
      this.stylesheet.replaceSync(css)
    }
  }

  destroy() {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      sheet => sheet !== this.stylesheet
    )
  }
}

class HeightCalculator {
  constructor(textarea, stylesheetManager) {
    this.textarea = textarea
    this.stylesheetManager = stylesheetManager
  }

  update(options = {}) {
    const { testForHeightReduction = true } = options
    const computedStyle = window.getComputedStyle(this.textarea)
    const initialOverflowY = computedStyle.overflowY

    if (this.textarea.scrollHeight === 0) return

    let restoreScrollPositions
    if (testForHeightReduction) {
      restoreScrollPositions = this.#cacheScrollPositions(this.textarea)
      this.stylesheetManager.setHeight('')
    }

    let newHeight = this.#calculateHeight(this.textarea, computedStyle)
    let overflowRule = ''

    // Handle max-height constraint
    if (computedStyle.maxHeight !== 'none' && newHeight > parseFloat(computedStyle.maxHeight)) {
      if (computedStyle.overflowY === 'hidden') {
        overflowRule = 'overflow: scroll !important;'
      }
      newHeight = parseFloat(computedStyle.maxHeight)
    } else if (computedStyle.overflowY !== 'hidden') {
      overflowRule = 'overflow: hidden !important;'
    }

    const cssRules = this.#buildCssRules(computedStyle)
    const allRules = [cssRules, overflowRule].filter(Boolean).join(' ')

    this.stylesheetManager.setHeight(newHeight + 'px', allRules)

    if (restoreScrollPositions) {
      restoreScrollPositions()
    }
  }

  #buildCssRules(computedStyle) {
    const rules = []

    // Handle resize property
    if (computedStyle.resize === 'vertical') {
      rules.push('resize: none !important;')
    } else if (computedStyle.resize === 'both') {
      rules.push('resize: horizontal !important;')
    }

    return rules.filter(Boolean).join(' ')
  }

  #cacheScrollPositions(element) {
    const positions = []
    let current = element.parentNode

    while (current && current instanceof Element) {
      if (current.scrollTop) {
        positions.push([current, current.scrollTop])
      }
      current = current.parentNode
    }

    return () => {
      positions.forEach(([node, scrollTop]) => {
        node.style.scrollBehavior = 'auto'
        node.scrollTop = scrollTop
        node.style.scrollBehavior = null
      })
    }
  }

  #calculateHeight(textarea, computedStyle) {
    if (computedStyle.boxSizing === 'content-box') {
      return textarea.scrollHeight - (
        parseFloat(computedStyle.paddingTop) +
        parseFloat(computedStyle.paddingBottom)
      )
    } else {
      return textarea.scrollHeight +
        parseFloat(computedStyle.borderTopWidth) +
        parseFloat(computedStyle.borderBottomWidth)
    }
  }
}

class InputHandler {
  constructor(textarea, heightCalculator) {
    this.textarea = textarea
    this.heightCalculator = heightCalculator
    this.previousValue = textarea.value
  }

  handleInput = () => {
    this.heightCalculator.update({
      testForHeightReduction: this.previousValue === '' || !this.textarea.value.startsWith(this.previousValue),
    })
    this.previousValue = this.textarea.value
  }
}

class TextareaController {
  constructor(textarea) {
    this.textarea = textarea
    this.stylesheetManager = new StylesheetManager(textarea)
    this.heightCalculator = new HeightCalculator(textarea, this.stylesheetManager)
    this.inputHandler = new InputHandler(textarea, this.heightCalculator)
    this.valueSetter = new ValueSetter(textarea, this)
    this.#attachEventListeners()
    this.heightCalculator.update()
  }

  #attachEventListeners() {
    this.textarea.addEventListener('input', this.inputHandler.handleInput)
  }

  update = () => {
    this.heightCalculator.update({
      testForHeightReduction: true,
    })
  }

  destroy() {
    this.valueSetter.destroy()
    this.#removeEventListeners()
    this.stylesheetManager.destroy()
  }

  #removeEventListeners() {
    this.textarea.removeEventListener('input', this.inputHandler.handleInput)
  }
}

class WindowResizeHandler {
  constructor(manager) {
    this.manager = manager
    this.resizeTimeout = null
    this.setupHandler()
  }

  setupHandler() {
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout)
      this.resizeTimeout = setTimeout(() => {
        this.manager.updateAllControllers()
      }, 100)
    })
  }
}

class FormResetHandler {
  constructor(manager) {
    this.manager = manager
    this.setupHandler()
  }

  setupHandler() {
    document.addEventListener('reset', (event) => {
      const textareas = event.target.querySelectorAll('textarea[autosize]')
      textareas.forEach(textarea => {
        setTimeout(() => {
          this.manager.updateController(textarea)
        }, 0)
      })
    })
  }
}

class ValueSetter {
  constructor(textarea, controller) {
    this.textarea = textarea
    this.controller = controller
    this.install()
  }

  install() {
    if (this.textarea._autosizeValueOverridden) return

    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
    const originalSetter = originalDescriptor.set
    const originalGetter = originalDescriptor.get
    const controller = this.controller

    Object.defineProperty(this.textarea, 'value', {
      get: originalGetter,
      set: function(newValue) {
        const oldValue = originalGetter.call(this)
        originalSetter.call(this, newValue)
        if (oldValue !== newValue) {
          setTimeout(() => controller.update(), 0)
        }
      },
      configurable: true
    })

    this.textarea._autosizeValueOverridden = true
  }

  destroy() {
    if (this.textarea._autosizeValueOverridden) {
      delete this.textarea.value
      delete this.textarea._autosizeValueOverridden
    }
  }
}

class LazyLoader {
  constructor() {
    this.observers = new Map()
  }

  setup(textarea, onVisible) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          onVisible()
          this.cleanup(textarea)
        }
      })
    }, { rootMargin: '50px' })

    observer.observe(textarea)
    this.observers.set(textarea, observer)
  }

  cleanup(textarea) {
    const observer = this.observers.get(textarea)
    if (observer) {
      observer.disconnect()
      this.observers.delete(textarea)
    }
  }
}

class AutosizeManager {
  constructor() {
    this.textareaControllers = new Map()
    this.lazyLoader = new LazyLoader()
    this.windowResizeHandler = new WindowResizeHandler(this)
    this.formResetHandler = new FormResetHandler(this)
    this.initialized = false
  }

  createController(textarea) {
    this.textareaControllers.set(textarea, new TextareaController(textarea))
  }

  updateController(textarea) {
    this.textareaControllers.get(textarea)?.update()
  }

  updateAllControllers() {
    this.textareaControllers.forEach(controller => controller.update())
  }

  destroyController(textarea) {
    const controller = this.textareaControllers.get(textarea)
    if (controller) {
      controller.destroy()
      this.textareaControllers.delete(textarea)
    }
  }

  init() {
    if (this.initialized) return
    this.initialized = true

    this.#processExistingTextareas()
    this.#setupMutationObserver()
  }

  #processExistingTextareas() {
    const textareas = document.querySelectorAll('textarea[autosize]')
    textareas.forEach(textarea => this.#processTextarea(textarea))
  }

  #setupMutationObserver() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => this.#processNode(node, textarea => this.#processTextarea(textarea)))
        mutation.removedNodes.forEach(node => this.#processNode(node, textarea => this.#cleanupTextarea(textarea)))

        if (mutation.type === 'attributes' && mutation.attributeName === 'autosize') {
          const target = mutation.target
          if (target.hasAttribute('autosize')) {
            this.#processTextarea(target)
          } else {
            this.#cleanupTextarea(target)
          }
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['autosize']
    })
  }

  #processNode(node, callback) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.matches && node.matches('textarea[autosize]')) {
        callback(node)
      }
      const textareas = node.querySelectorAll && node.querySelectorAll('textarea[autosize]')
      if (textareas) {
        textareas.forEach(callback)
      }
    }
  }

  #processTextarea(textarea) {
    if (textarea.getAttribute('autosize') === 'lazy') {
      this.lazyLoader.setup(textarea, () => {
        this.#initializeTextarea(textarea)
      })
    } else {
      this.#initializeTextarea(textarea)
    }
  }

  #initializeTextarea(textarea) {
    if (this.textareaControllers.has(textarea)) return

    this.createController(textarea)
  }

  #cleanupTextarea(textarea) {
    if (this.textareaControllers.has(textarea)) {
      this.destroyController(textarea)
    }

    this.lazyLoader.cleanup(textarea)
  }
}

const autosizeManager = new AutosizeManager()
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => autosizeManager.init())
} else {
  autosizeManager.init()
}
