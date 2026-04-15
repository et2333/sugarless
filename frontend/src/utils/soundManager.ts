/**
 * Reminder Sound Manager
 * Handles playing different sound patterns for reminders based on priority
 */

class ReminderSound {
  private audio: HTMLAudioElement | null = null;
  private playCount: number = 0;
  private maxPlays: number = 3;
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];

  /**
   * Play sound multiple times
   */
  playMultipleTimes(times: number = 3, interval: number = 1000): void {
    this.playCount = 0;
    this.maxPlays = times;

    const playOnce = () => {
      if (this.playCount < this.maxPlays) {
        this.play();
        this.playCount++;
        setTimeout(playOnce, interval);
      }
    };

    playOnce();
  }

  /**
   * Play different sound patterns
   */
  playPattern(pattern: 'urgent' | 'normal' | 'gentle' = 'normal'): void {
    const patterns = {
      urgent: [300, 300, 300], // Short 3 beeps
      normal: [500, 1000, 500], // Long-pause-long
      gentle: [200, 500, 200, 500, 200] // Gentle 5 beeps
    };

    const sequence = patterns[pattern];
    let delay = 0;

    sequence.forEach((duration, index) => {
      if (index % 2 === 0) {
        // Play sound
        setTimeout(() => this.play(duration), delay);
      }
      delay += duration;
    });
  }

  /**
   * Basic play method using Web Audio API
   */
  play(duration: number = 500, frequency: number = 800): void {
    try {
      // Create Web Audio API tone
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set tone properties
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine'; // Waveform type

      // Set volume envelope
      const durationSeconds = duration / 1000;
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + durationSeconds);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + durationSeconds);

      // Store oscillator for potential cleanup
      this.oscillators.push(oscillator);
      
            // Clean up after playing
      oscillator.onended = () => {
        const index = this.oscillators.indexOf(oscillator);
        if (index > -1) {
          this.oscillators.splice(index, 1);
        }
      };
    } catch (error: unknown) {
      console.error('Error playing sound:', error);
    }
  }

  /**
   * Play ringtone file
   */
  playRingtone(): void {
    // Try multiple fallback audio files
    const sounds = [
      '/sounds/alarm1.mp3',
      '/sounds/notification.mp3',
      '/sounds/reminder.mp3'
    ];

    try {
      this.audio = new Audio(sounds[0]);
      this.audio.volume = 0.7;
      this.audio.loop = true;

      this.audio.play().catch((e) => {
        console.log('Audio file failed, using Web Audio API fallback');
        // If audio file fails, use Web Audio API
        this.playPattern('urgent');
      });

      // Stop after 5 seconds
      setTimeout(() => {
        this.stop();
      }, 5000);
    } catch (error) {
      console.error('Error playing ringtone:', error);
      // Fallback to Web Audio API
      this.playPattern('urgent');
    }
  }

  /**
   * Stop all sounds
   */
  stop(): void {
    // Stop audio file
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }

      // Stop all oscillators
    this.oscillators.forEach(oscillator => {
      try {
        oscillator.stop();
      } catch (_e) {
        // Oscillator might already be stopped
      }
    });
    this.oscillators = [];

    // Reset play count
    this.playCount = this.maxPlays;
  }

  /**
   * Play sound based on priority
   */
  playByPriority(priority: 'high' | 'medium' | 'low' | string = 'medium'): void {
    const priorityLower = priority.toLowerCase();
    
    switch (priorityLower) {
      case 'urgent':
      case 'high':
        // Urgent: 3 quick beeps
        this.playMultipleTimes(3, 800);
        break;
      case 'medium':
        // Medium: 2 beeps
        this.playMultipleTimes(2, 1000);
        break;
      case 'low':
        // Low: 1 beep
        this.play();
        break;
      default:
        this.playPattern('normal');
    }
  }
}

export const reminderSound = new ReminderSound();

