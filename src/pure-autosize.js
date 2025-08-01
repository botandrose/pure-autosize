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

class AutosizeRegistry {
  constructor() {
    this.lazyLoader = new LazyLoader()
    this.controllers = new Map()
    this.windowResizeHandler = new WindowResizeHandler(this)
    this.formResetHandler = new FormResetHandler(this)
    this.cssQueryObserver = new CSSQueryObserver('textarea[autosize]', {
      onAdded: this.add.bind(this),
      onRemoved: this.remove.bind(this)
    })
  }

  add(textarea) {
    if (this.controllers.has(textarea)) return

    if (textarea.getAttribute('autosize') === 'lazy') {
      this.lazyLoader.setup(textarea, () => {
        this.controllers.set(textarea, new Controller(textarea))
      })
    } else {
      this.controllers.set(textarea, new Controller(textarea))
    }
  }

  remove(textarea) {
    this.controllers.get(textarea)?.destroy()
    this.controllers.delete(textarea)
    this.lazyLoader.cleanup(textarea)
  }

  update(textarea, options = {}) {
    if (textarea) {
      this.controllers.get(textarea)?.update(options)
    } else {
      this.controllers.forEach(c => c.update(options))
    }
  }
}

class CSSQueryObserver {
  constructor(selector, { onAdded, onRemoved }) {
    this.selector = selector
    this.onAdded = onAdded
    this.onRemoved = onRemoved
    this.observer = null
    this.attributeNames = this.#parseAttributeNames(selector)

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.#init())
    } else {
      this.#init()
    }
  }

  #init() {
    this.#processExistingElements()
    this.#setupMutationObserver()
  }

  #parseAttributeNames(selector) {
    // Extract attribute names from selector like "textarea[autosize]" or "div[data-foo][bar]"
    const matches = selector.match(/\[([^\]]+)\]/g)
    if (!matches) return []

    return matches.map(match => {
      // Remove brackets and extract just the attribute name (before = if present)
      const attr = match.slice(1, -1)
      return attr.split('=')[0]
    })
  }

  #processExistingElements() {
    const elements = document.querySelectorAll(this.selector)
    elements.forEach(element => this.onAdded(element))
  }

  #setupMutationObserver() {
    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => this.#processNode(node, this.onAdded))
        mutation.removedNodes.forEach(node => this.#processNode(node, this.onRemoved))

        if (mutation.type === "attributes") {
          const target = mutation.target
          if (target.matches?.(this.selector)) {
            this.onAdded(target)
          } else {
            this.onRemoved(target)
          }
        }
      })
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: this.attributeNames.length > 0,
      attributeFilter: this.attributeNames.length > 0 ? this.attributeNames : undefined
    })
  }

  #processNode(node, callback) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.matches?.(this.selector)) {
        callback(node)
      }
      const matchingChildren = node.querySelectorAll?.(this.selector)
      if (matchingChildren) {
        matchingChildren.forEach(callback)
      }
    }
  }

  destroy() {
    this.observer?.disconnect()
    this.observer = null
  }
}

class LazyLoader {
  constructor() {
    this.observers = new Map()
  }

  setup(element, onVisible) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          onVisible()
          this.cleanup(element)
        }
      })
    }, { rootMargin: '50px' })

    observer.observe(element)
    this.observers.set(element, observer)
  }

  cleanup(element) {
    this.observers.get(element)?.disconnect()
    this.observers.delete(element)
  }
}

class Controller {
  constructor(textarea) {
    this.textarea = textarea
    this.stylesheetManager = new StylesheetManager(textarea)
    this.textareaResizer = new TextareaResizer(textarea, this.stylesheetManager)
    this.inputHandler = new InputHandler(textarea, this)
    this.valueSetter = new ValueSetter(textarea, this)
    this.update()
  }

  update(options = {}) {
    this.textareaResizer.update(options)
  }

  destroy() {
    this.valueSetter.destroy()
    this.inputHandler.destroy()
    this.stylesheetManager.destroy()
  }
}


class TextareaResizer {
  constructor(textarea, stylesheetManager) {
    this.textarea = textarea
    this.stylesheetManager = stylesheetManager
  }

  update(options = {}) {
    if (this.textarea.scrollHeight === 0 || this.textarea.value === '') {
      this.stylesheetManager.reset()
      return
    }

    // Only clear CSS for accurate measurement if height might reduce (expensive operation)
    if (this.#willReduceHeight(options.previousValue)) {
      // Temporarily clear our CSS rules to get accurate scrollHeight for the current content
      this.stylesheetManager.reset()
    }

    const computedStyle = window.getComputedStyle(this.textarea)
    let newHeight = this.#calculateHeightFromScrollHeight(this.textarea.scrollHeight, computedStyle)

    // Handle max-height constraint
    let overflowRule = ''
    if (computedStyle.maxHeight !== 'none' && newHeight > parseFloat(computedStyle.maxHeight)) {
      if (computedStyle.overflowY === 'hidden') {
        overflowRule = 'overflow: scroll !important;'
      }
      newHeight = parseFloat(computedStyle.maxHeight)
    } else if (computedStyle.overflowY !== 'hidden') {
      overflowRule = 'overflow: hidden !important;'
    }

    const css = `
      height: ${newHeight}px !important;
      overflow-x: hidden !important;
      word-wrap: break-word !important;
      ${overflowRule}
    `
    this.stylesheetManager.replace(css);
  }

  #willReduceHeight(previousValue) {
    const value = this.textarea.value
    if (!previousValue) return false
    if (value.startsWith(previousValue)) return false
    return true
  }

  #calculateHeightFromScrollHeight(scrollHeight, computedStyle) {
    if (computedStyle.boxSizing === 'content-box') {
      return scrollHeight - (
        parseFloat(computedStyle.paddingTop) +
        parseFloat(computedStyle.paddingBottom)
      )
    } else {
      return scrollHeight +
        parseFloat(computedStyle.borderTopWidth) +
        parseFloat(computedStyle.borderBottomWidth)
    }
  }
}

class WindowResizeHandler {
  constructor(manager) {
    this.manager = manager
    this.resizeTimeout = null
    window.addEventListener('resize', this.#onResize)
  }

  #onResize = () => {
    clearTimeout(this.resizeTimeout)
    this.resizeTimeout = setTimeout(() => {
      this.manager.update()
    }, 100)
  }
}

class FormResetHandler {
  constructor(manager) {
    this.manager = manager
    document.addEventListener('reset', this.#onReset)
  }

  #onReset = (event) => {
    const textareas = event.target.querySelectorAll('textarea[autosize]')
    textareas.forEach(textarea => {
      const previousValue = textarea.value
      setTimeout(() => {
        // For form resets, we know the textarea will change to its default value
        this.manager.update(textarea, { previousValue })
      }, 1)
    })
  }
}

class InputHandler {
  constructor(textarea, controller) {
    this.textarea = textarea
    this.controller = controller
    this.previousValue = textarea.value
    this.textarea.addEventListener('input', this.#onInput)
  }

  #onInput = () => {
    this.controller.update({
      previousValue: this.previousValue
    })
    this.previousValue = this.textarea.value
  }

  destroy() {
    this.textarea.removeEventListener('input', this.#onInput)
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
        const previousValue = originalGetter.call(this)
        originalSetter.call(this, newValue)
        if (previousValue !== newValue) {
          setTimeout(() => controller.update({ previousValue }), 0)
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

class StylesheetManager {
  constructor(element) {
    this.element = element
    this.stylesheet = new CSSStyleSheet()

    // Ensure element has an ID for CSS targeting
    if (!element.id) {
      element.id = 'element-' + Math.random().toString(36).substr(2, 9)
    }

    document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.stylesheet]
  }

  reset() {
    this.replace()
  }

  replace(cssRules = '') {
    if (cssRules === '') {
      this.stylesheet.replaceSync('')
    } else {
      const css = `#${this.element.id} { ${cssRules} }`
      this.stylesheet.replaceSync(css)
    }
  }

  destroy() {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      sheet => sheet !== this.stylesheet
    )
  }
}

window.autosizeRegistry = new AutosizeRegistry()
