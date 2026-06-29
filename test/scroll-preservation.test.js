import { expect } from '@esm-bundle/chai'
import '../src/pure-autosize.js'

// Regression test for ticket 264970: resizing the textarea discarded its
// scrollable ancestors' scroll position, jumping the page to the top while typing.
// Synthetic input can't drive a real caret, so we assert the invariant directly
// rather than simulate typing.

const TA_STYLE = 'width:200px; font-size:14px; line-height:20px; padding:8px; border:1px solid #ccc; box-sizing:border-box;'
const TWELVE_LINES = 'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10\nL11\nL12'

function settle(ms = 60) { return new Promise(resolve => setTimeout(resolve, ms)) }

// Same line count keeps the final height unchanged, so any scrollTop change is
// the resize bug rather than a legitimate reflow.
function editMiddleSameHeight(textarea) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
  const value = textarea.value
  const edited = value[0] + 'X' + value.slice(2)
  descriptor.set.call(textarea, edited)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('Scroll preservation', () => {
  beforeEach(() => { document.adoptedStyleSheets = [] })
  afterEach(() => { document.body.innerHTML = ''; document.adoptedStyleSheets = [] })

  it('keeps a scrollable ancestor in place when the textarea resizes', async () => {
    document.body.innerHTML =
      `<div id="scroller" style="height:150px; overflow:auto;">` +
        `<textarea autosize style="${TA_STYLE}">${TWELVE_LINES}</textarea>` +
      `</div>`
    const textarea = document.querySelector('textarea')
    await settle()

    const scroller = document.getElementById('scroller')
    scroller.scrollTop = 1000 // clamps to the bottom
    const before = scroller.scrollTop
    expect(before, 'sanity: the ancestor is actually scrolled').to.be.greaterThan(0)

    editMiddleSameHeight(textarea)
    await settle()

    expect(scroller.scrollTop, 'ancestor scroll position must survive a resize').to.equal(before)
  })
})
