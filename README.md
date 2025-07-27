# Pure Autosize

A declarative, framework-agnostic library for automatically resizing textareas that survives DOM morphing operations.

## Features

- **🚀 Zero DOM mutations** - Uses Constructed Stylesheets (modern browsers only)
- **🔄 Morphing-resistant** - Survives Turbo, idiomorph, and other DOM morphing operations
- **📝 Declarative API** - Simple `autosize` attribute
- **⚡ Lazy loading** - Optional `autosize="lazy"` for performance
- **🎯 Framework-agnostic** - Works with any framework or vanilla JS

## Browser Support

- Chrome 73+ (March 2019)
- Firefox 101+ (May 2022)
- Safari 16.4+ (March 2023)

*For older browser support, consider using the classic autosize.js library.*

## Installation

```bash
npm install pure-autosize
```

## Usage

### Basic Usage

```html
<!-- Automatic resizing -->
<textarea autosize></textarea>

<!-- Lazy loading (waits until visible) -->
<textarea autosize="lazy"></textarea>
```

```javascript
import 'pure-autosize';
// That's it! The library auto-initializes and manages everything
```

## How It Works

Pure Autosize detects content changes through multiple mechanisms:

1. **User input** - Standard `input` events
2. **Form resets** - `reset` event handlers
3. **Programmatic changes** - Value property override
4. **Window resizing** - Debounced resize handlers
5. **Dynamic elements** - MutationObserver for new textareas

The library uses **Constructed Stylesheets** to apply height styles without DOM mutations, making it completely resistant to morphing operations that would normally interfere with inline styles.

## Why Pure Autosize?

Traditional autosize libraries use inline `style` attributes which get overwritten during DOM morphing operations (like those used by Turbo, HTMX, idiomorph, etc.). Pure Autosize solves this by:

- Using Constructed Stylesheets that exist in memory only
- Detecting content changes via property overrides
- Automatically handling all edge cases

This makes it perfect for modern applications using:
- **Turbo** (Rails/Hotwire)
- **HTMX** with morphing extensions
- **idiomorph**
- **Phoenix LiveView**
- Any framework that morphs/replaces DOM content

## API Reference

### HTML Attributes

- `autosize` - Enable automatic resizing
- `autosize="lazy"` - Enable lazy loading (resize only when visible)

## Testing

This library is thoroughly tested across all supported browsers:

```bash
npm test              # Run tests on default browser (Chrome)
npm run test:all      # Run tests on Chrome, Firefox, and WebKit
npm run test:chrome   # Test Chrome specifically
npm run test:firefox  # Test Firefox specifically
npm run test:webkit   # Test WebKit/Safari specifically
```

See [TESTING.md](TESTING.md) for detailed testing instructions.

## License

MIT License - see [LICENSE](LICENSE) file.
