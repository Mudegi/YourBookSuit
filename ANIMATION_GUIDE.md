# Modern Animation Guide

## Overview
Your application now has comprehensive modern animations for all UI elements. Windows, modals, dropdowns, and interactive elements now appear and disappear with smooth, professional animations.

## Available Animation Classes

### Fade Animations
```tsx
// Fade in element
<div className="animate-fade-in">Content</div>

// Fade out element  
<div className="animate-fade-out">Content</div>
```

### Scale Animations (Perfect for Modals)
```tsx
// Scale in with fade - Great for modals and dialogs
<div className="animate-scale-in">Modal Content</div>

// Scale out
<div className="animate-scale-out">Modal Content</div>
```

### Slide Animations (Perfect for Menus & Sidebars)
```tsx
// Slide from left
<div className="animate-slide-left">Sidebar</div>

// Slide from right
<div className="animate-slide-right">Panel</div>

// Slide from top
<div className="animate-slide-up">Dropdown</div>

// Slide from bottom
<div className="animate-slide-down">Bottom Sheet</div>
```

### Special Effects
```tsx
// Bounce in - Attention grabbing
<div className="animate-bounce-in">Important Notice</div>

// Shake - For errors
<div className="animate-shake">Error Message</div>

// Pulse - For loading states
<div className="animate-pulse-slow">Loading...</div>

// Slide up with fade - Smooth appearance
<div className="animate-slide-up-fade">Content</div>
```

### Transition Utilities
```tsx
// Smooth transitions for hover effects
<button className="transition-smooth hover:scale-105">
  Hover Me
</button>

// Fast transitions
<button className="transition-fast hover:bg-blue-500">
  Quick Change
</button>

// Slow transitions
<button className="transition-slow hover:rotate-12">
  Slow Motion
</button>
```

## Enhanced Components

### Modal Component
The modal now automatically uses fade-in and scale-in animations:
```tsx
import { Modal } from '@/components/ui/modal';

<Modal isOpen={isOpen} onClose={handleClose} title="My Modal">
  {/* Modal content automatically animates in */}
</Modal>
```

### Navigation Flyout
Navigation menus now slide in from the right with staggered item animations.

### Dashboard Cards
All dashboard KPI cards now:
- Fade in on page load
- Scale up slightly on hover
- Have staggered appearance (each card animates with a slight delay)

## Staggered Animations
For lists or multiple items, use inline styles with animationDelay:

```tsx
{items.map((item, index) => (
  <div 
    key={item.id}
    className="animate-slide-up"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    {item.content}
  </div>
))}
```

## Hover Effects
Combine animations with hover for interactive feedback:

```tsx
// Scale on hover
<button className="transition-smooth transform hover:scale-110">
  Click Me
</button>

// Translate on hover
<div className="transition-smooth hover:translate-x-2">
  Slide Right
</div>

// Multiple effects
<div className="transition-smooth transform hover:scale-105 hover:shadow-xl">
  Card with Multiple Effects
</div>
```

## Best Practices

1. **Don't overdo it**: Use animations purposefully, not everywhere
2. **Keep it fast**: Most animations are 200-300ms for snappy feel
3. **Use delays sparingly**: For lists, keep delays under 50ms per item
4. **Match the context**: 
   - Modals: scale-in
   - Sidebars: slide animations
   - Dropdowns: slide-up or slide-down
   - Notifications: slide-in-from-top or bounce-in
5. **Accessibility**: Animations respect user preferences (can be enhanced with prefers-reduced-motion)

## Examples in Your App

### Dashboard (✓ Enhanced)
- Page fades in on load
- Header slides down
- KPI cards slide up with staggered delays
- Cards scale up on hover

### Modals (✓ Enhanced)
- Backdrop fades in
- Modal content scales in
- Smooth, professional feel

### Navigation (✓ Enhanced)
- Flyout menus slide in from right
- Menu items have subtle hover translate effect

## Customization

To create custom animations, add to `globals.css`:

```css
@keyframes myCustomAnimation {
  from {
    opacity: 0;
    transform: rotateY(90deg);
  }
  to {
    opacity: 1;
    transform: rotateY(0);
  }
}

.animate-my-custom {
  animation: myCustomAnimation 400ms ease-out;
}
```

## Performance Tips

1. Use `transform` and `opacity` for animations (GPU accelerated)
2. Avoid animating `width`, `height`, `top`, `left` (causes reflow)
3. Use `will-change` sparingly for complex animations
4. Keep animation duration under 400ms for most UI elements

## Browser Support

All animations use standard CSS animations supported in:
- Chrome/Edge 43+
- Firefox 16+
- Safari 9+
- All modern mobile browsers

No JavaScript required - pure CSS performance!
