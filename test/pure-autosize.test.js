import { expect } from '@esm-bundle/chai'
import '../src/pure-autosize.js'
import {
  expectHeightToChange,
  expectHeightToIncrease,
  expectHeightToDecrease,
  expectHeightNotToChange,
  simulateTyping,
  simulatePaste,
  simulateBackspace,
  setupTextarea,
  setupGlobalTestHooks
} from './test-helpers.js'

describe('Pure Autosize', () => {
  setupGlobalTestHooks()

  describe('Basic Autosize Functionality', () => {

    describe('Trigger 1: Input Events (User Typing)', () => {
      it('should resize as user types content', async () => {
        const textarea = await setupTextarea('<textarea autosize></textarea>')
        await expectHeightToIncrease(textarea).when(async () => {
          simulateTyping(textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5')
        })
      })

      it('should resize on paste operation', async () => {
        const textarea = await setupTextarea('<textarea autosize></textarea>')
        await expectHeightToIncrease(textarea).when(async () => {
          simulatePaste(textarea, 'Pasted content\nLine 2\nLine 3')
        })
      })

      it('should handle backspace deletion', async () => {
        const textarea = await setupTextarea('<textarea autosize>Line 1\nLine 2\nLine 3</textarea>')
        await expectHeightToDecrease(textarea).when(async () => {
          simulateBackspace(textarea, 8); // Remove "\nLine 3"
        })
      })

      it('should handle user replacing all content', async () => {
        const textarea = await setupTextarea('<textarea autosize>Original long content\nWith multiple lines\nThat takes up space</textarea>')
        await expectHeightToDecrease(textarea).when(async () => {
          simulateTyping(textarea, 'Short', { replace: true })
        })
      })
    })

    describe('Trigger 2: Value Setter (Morphing/Programmatic)', () => {
      it('should resize when value is set programmatically', async () => {
        const textarea = await setupTextarea('<textarea autosize></textarea>')
        await expectHeightToIncrease(textarea).when(async () => {
          textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4'
        })
      })


      it('should work with empty string assignment', async () => {
        const textarea = await setupTextarea('<textarea autosize>Line 1\nLine 2\nLine 3</textarea>')
        await expectHeightToDecrease(textarea).when(async () => {
          textarea.value = ''
        })
      })
    })

    describe('Trigger 3: Window Resize', () => {
      it('should recalculate height when textarea width changes', async () => {
        const textarea = await setupTextarea('<textarea autosize>This is some long content that will wrap differently when the width changes and should cause height recalculation</textarea>')
        await expectHeightToChange(textarea).when(async () => {
          // Change the textarea width to simulate resize
          textarea.style.width = '100px'
          window.dispatchEvent(new Event('resize'))
          // Wait for debounced resize handler
          await new Promise(resolve => setTimeout(resolve, 150))
        })
      })
    })


    describe('Edge Cases & Combinations', () => {
      it('should handle multiple triggers in sequence', async () => {
        const textarea = await setupTextarea('<textarea autosize></textarea>')
        const initialHeight = textarea.offsetHeight

        // Trigger 1: Value setter with enough content to change height
        textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
        await new Promise(resolve => setTimeout(resolve, 50)); // Let expansion happen

        const afterValueHeight = textarea.offsetHeight

        // Trigger 2: Input event with more content
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(
          textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6'
        )
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
        await new Promise(resolve => setTimeout(resolve, 50)); // Let expansion happen

        // Trigger 3: Window resize
        window.dispatchEvent(new Event('resize'))
        await new Promise(resolve => setTimeout(resolve, 150)); // Wait for debounced handler

        expect(afterValueHeight).to.be.greaterThan(initialHeight)
      })

      it('should not resize when autosize attribute is removed', async () => {
        const textarea = await setupTextarea('<textarea autosize></textarea>')
        // First establish that autosize is working
        await expectHeightToIncrease(textarea).when(async () => {
          textarea.value = 'Line 1\nLine 2\nLine 3'
        })

        // Remove autosize attribute
        textarea.removeAttribute('autosize')
        await new Promise(resolve => setTimeout(resolve, 50)); // Let cleanup happen

        // Now content changes should not affect height
        await expectHeightNotToChange(textarea).when(async () => {
          textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6'
        })
      })

      it('should handle rapid value changes', async () => {
        const textarea = await setupTextarea('<textarea autosize></textarea>')
        await expectHeightToIncrease(textarea).when(async () => {
          // Rapid value changes (simulating fast morphing)
          textarea.value = 'Line 1'
          textarea.value = 'Line 1\nLine 2'
          textarea.value = 'Line 1\nLine 2\nLine 3'
        })
      })
    })
  })

  describe('Form Reset Functionality', () => {

    describe('Trigger 4: Form Reset', () => {
      it('should shrink textarea after form reset', async () => {
        const textarea = await setupTextarea('<textarea autosize>Line 1\nLine 2\nLine 3\nLine 4</textarea>')

        const form = document.createElement('form')
        form.appendChild(textarea)
        document.body.appendChild(form)

        await expectHeightToDecrease(textarea).when(async () => {
          form.reset()
        })

        form.remove()
      })
    })
  })

  describe('Lazy Loading Functionality', () => {
    describe('Trigger 6: Lazy Loading Intersection', () => {
      it('should enable autosize when lazy textarea becomes visible', async () => {
        const textarea = await setupTextarea('<textarea autosize="lazy" style="position: absolute; top: 2000px;">Line 1\nLine 2\nLine 3\nLine 4\nLine 5</textarea>')
        await expectHeightToIncrease(textarea).when(async () => {
          textarea.style.top = '0px'
        })
      })

      it('should not autosize while lazy textarea is off-screen', async () => {
        const textarea = await setupTextarea('<textarea autosize="lazy" style="position: absolute; top: 5000px;"></textarea>')
        await expectHeightNotToChange(textarea).when(async () => {
          textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
        })
      })
    })
  })

  describe('Dynamic Textarea Management', () => {
    describe('Trigger 5: Initial Autosize Application', () => {
      it('should apply autosize immediately on page load', async () => {
        const textarea = await setupTextarea('<textarea autosize style="position: absolute; top: 5000px;"></textarea>')
        await expectHeightNotToChange(textarea).when(async () => {
          textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
        })
      })

      it('should apply autosize to dynamically added textareas', async () => {
        const textarea = await setupTextarea('<textarea>Line 1\nLine 2\nLine 3\nLine 4\nLine 5</textarea>')
        await expectHeightToChange(textarea).when(async () => {
          textarea.setAttribute('autosize', '')
        })
      })

      it('should handle textarea without autosize attribute', async () => {
        const textarea = await setupTextarea('<textarea></textarea>')
        await expectHeightNotToChange(textarea).when(async () => {
          textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
        })
      })
    })
  })
})
