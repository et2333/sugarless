/**
 * Visual Alert Manager
 * Handles visual alerts like flashing title, background, and device vibration
 */

let originalTitle: string = '';
let flashTitleInterval: NodeJS.Timeout | null = null;

/**
 * Enhance visual alert with multiple effects
 */
export function enhanceVisualAlert(reminderTitle?: string): void {
  // 1. Flash page title
  originalTitle = document.title;
  let isFlashing = true;
  const alertText = reminderTitle 
    ? `🔔 ${reminderTitle.length > 20 ? reminderTitle.substring(0, 20) + '...' : reminderTitle}` 
    : '🔔 Reminder!';

  flashTitleInterval = setInterval(() => {
    document.title = isFlashing ? alertText : originalTitle;
    isFlashing = !isFlashing;
  }, 500);

  // 2. Flash page background
  const body = document.body;
  body.style.animation = 'flash-bg 0.5s 5';
  
  // Add CSS animation if not already present
  if (!document.getElementById('reminder-alert-styles')) {
    const style = document.createElement('style');
    style.id = 'reminder-alert-styles';
    style.textContent = `
      @keyframes flash-bg {
        0%, 100% { background-color: inherit; }
        50% { background-color: rgba(255, 77, 79, 0.1); }
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      
      .reminder-alert-shake {
        animation: shake 0.5s 5;
      }
    `;
    document.head.appendChild(style);
  }

  // 3. Vibrate (mobile devices)
  if ('vibrate' in navigator) {
    // Vibration pattern: vibrate-pause-vibrate-pause-vibrate
    navigator.vibrate([200, 100, 200, 100, 200]);
  }

  // Stop after 5 seconds
  setTimeout(() => {
    stopVisualAlert();
  }, 5000);
}

/**
 * Stop visual alerts
 */
export function stopVisualAlert(): void {
  // Stop flashing title
  if (flashTitleInterval) {
    clearInterval(flashTitleInterval);
    flashTitleInterval = null;
  }
  
  // Restore original title
  if (originalTitle) {
    document.title = originalTitle;
  }

  // Remove background animation
  const body = document.body;
  body.style.animation = '';

  // Stop vibration
  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }
}

/**
 * Flash page title only (simpler version)
 */
export function flashTitle(text: string, duration: number = 5000): void {
  const original = document.title;
  let isFlashing = true;
  
  const interval = setInterval(() => {
    document.title = isFlashing ? text : original;
    isFlashing = !isFlashing;
  }, 500);

  setTimeout(() => {
    clearInterval(interval);
    document.title = original;
  }, duration);
}

