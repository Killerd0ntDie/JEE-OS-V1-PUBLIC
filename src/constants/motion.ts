import { Transition, Variants } from 'motion/react';

/**
 * JEE-OS Physics-Based Motion Tokens & Animation Presets
 * Designed for 60/120 FPS fluid interaction ergonomics.
 */

// 1. Spring Physics Presets
export const springs = {
  // Snappy for quick micro-interactions (buttons, checkboxes, toggles, active taps)
  snappy: {
    type: 'spring',
    stiffness: 450,
    damping: 30,
    mass: 0.8
  } as Transition,

  // Gentle for modals, large cards, popovers, and sliding sheets
  gentle: {
    type: 'spring',
    stiffness: 320,
    damping: 28,
    mass: 1
  } as Transition,

  // Bouncy for celebrations, badges, level-ups, and notifications
  bouncy: {
    type: 'spring',
    stiffness: 500,
    damping: 18,
    mass: 0.9
  } as Transition,

  // Fluid for layoutId gliding pills, tab bars, and floating indicators
  fluid: {
    type: 'spring',
    stiffness: 380,
    damping: 32,
    mass: 0.7
  } as Transition,

  // Subtitle/drawer slide spring
  drawer: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.9
  } as Transition
};

// 2. High-End Easing Curves
export const easings = {
  expoOut: [0.16, 1, 0.3, 1] as const,
  smooth: [0.25, 0.1, 0.25, 1.0] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
};

// 3. Tactile Tap / Hover Presets
export const tapPresets = {
  button: { scale: 0.98 },
  card: { scale: 0.99 },
  pill: { scale: 0.96 },
  icon: { scale: 0.92 }
};

export const hoverPresets = {
  subtleLift: { y: -2 },
  cardLift: { y: -3, transition: { duration: 0.2, ease: easings.expoOut } }
};

// 4. Modal & Dialog Animation Variants (GPU-Accelerated: Opacity & Transform Only)
export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
    y: 10
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 420,
      damping: 30,
      mass: 0.8
    }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: {
      duration: 0.14,
      ease: easings.expoOut
    }
  }
};

// 5. Backdrop Animation Variants (GPU-Accelerated: Opacity Fade)
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1, 
    transition: { duration: 0.18, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    transition: { duration: 0.14, ease: 'easeIn' } 
  }
};

// 6. Stagger Container & Item Sequences
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: springs.snappy 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    transition: { duration: 0.15 } 
  }
};

// 7. Drawer Slide Variants
export const drawerVariants: Record<'left' | 'right' | 'bottom', Variants> = {
  right: {
    initial: { x: '100%' },
    animate: { x: 0, transition: springs.drawer },
    exit: { x: '100%', transition: { duration: 0.2, ease: easings.expoOut } }
  },
  left: {
    initial: { x: '-100%' },
    animate: { x: 0, transition: springs.drawer },
    exit: { x: '-100%', transition: { duration: 0.2, ease: easings.expoOut } }
  },
  bottom: {
    initial: { y: '100%' },
    animate: { y: 0, transition: springs.drawer },
    exit: { y: '100%', transition: { duration: 0.2, ease: easings.expoOut } }
  }
};
