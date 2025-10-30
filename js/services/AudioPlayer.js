/**
 * AudioPlayer Service
 * Manages background music playback for the writer studio
 */

export class AudioPlayer {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.volume = this.loadVolume();
    this.tracks = {
      ambient: {
        name: '环绕 · 深夜漂流',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' // Ambient Space
      },
      lofi: {
        name: 'Lo-Fi · 城市光影',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_2c411a42dd.mp3' // Lofi Study
      },
      piano: {
        name: '钢琴 · 温柔晨光',
        url: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe05c21.mp3' // Piano Moment
      }
    };

    // Load saved state
    this.loadState();
  }

  /**
   * Initialize or get audio element
   */
  getAudio() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.volume = this.volume;

      // Add event listeners
      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.saveState();
        this.dispatchEvent('play');
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.saveState();
        this.dispatchEvent('pause');
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('Audio playback error:', e);
        this.isPlaying = false;
        this.dispatchEvent('error', { error: e });
      });

      this.audio.addEventListener('ended', () => {
        // This shouldn't fire due to loop, but just in case
        if (this.audio.loop) {
          this.audio.play().catch(err => console.warn('Auto-replay failed:', err));
        }
      });
    }
    return this.audio;
  }

  /**
   * Play a specific track
   * @param {string} trackId - Track identifier (ambient, lofi, piano)
   * @returns {Promise<void>}
   */
  async play(trackId) {
    const track = this.tracks[trackId];
    if (!track) {
      console.warn(`Track "${trackId}" not found`);
      return;
    }

    const audio = this.getAudio();

    // If same track is already playing, just resume
    if (this.currentTrack === trackId && audio.src) {
      if (audio.paused) {
        try {
          await audio.play();
        } catch (err) {
          console.warn('Play failed:', err);
          throw err;
        }
      }
      return;
    }

    // Switch to new track
    this.currentTrack = trackId;
    audio.src = track.url;

    try {
      await audio.play();
      this.saveState();
    } catch (err) {
      console.warn('Play failed:', err);
      this.isPlaying = false;
      throw err;
    }
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  /**
   * Stop playback and reset
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      this.saveState();
    }
  }

  /**
   * Toggle play/pause
   * @param {string} trackId - Track to play if not playing
   * @returns {Promise<boolean>} - New playing state
   */
  async toggle(trackId) {
    if (this.isPlaying && this.currentTrack === trackId) {
      this.pause();
      return false;
    } else {
      await this.play(trackId);
      return true;
    }
  }

  /**
   * Set volume
   * @param {number} level - Volume level (0.0 to 1.0)
   */
  setVolume(level) {
    const clampedLevel = Math.max(0, Math.min(1, level));
    this.volume = clampedLevel;
    if (this.audio) {
      this.audio.volume = clampedLevel;
    }
    this.saveVolume();
    this.dispatchEvent('volumechange', { volume: clampedLevel });
  }

  /**
   * Get current volume
   * @returns {number}
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Get current playing state
   * @returns {boolean}
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Get current track ID
   * @returns {string|null}
   */
  getCurrentTrack() {
    return this.currentTrack;
  }

  /**
   * Get track info
   * @param {string} trackId
   * @returns {object|null}
   */
  getTrack(trackId) {
    return this.tracks[trackId] || null;
  }

  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      const state = {
        currentTrack: this.currentTrack,
        isPlaying: this.isPlaying,
        volume: this.volume
      };
      localStorage.setItem('musicPlayerState', JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to save music player state:', err);
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem('musicPlayerState');
      if (saved) {
        const state = JSON.parse(saved);
        this.currentTrack = state.currentTrack || null;
        // Don't auto-play on load
        this.isPlaying = false;
        if (state.volume !== undefined) {
          this.volume = state.volume;
        }
      }
    } catch (err) {
      console.warn('Failed to load music player state:', err);
    }
  }

  /**
   * Save volume to localStorage
   */
  saveVolume() {
    try {
      localStorage.setItem('musicPlayerVolume', this.volume.toString());
    } catch (err) {
      console.warn('Failed to save volume:', err);
    }
  }

  /**
   * Load volume from localStorage
   * @returns {number}
   */
  loadVolume() {
    try {
      const saved = localStorage.getItem('musicPlayerVolume');
      if (saved) {
        const volume = parseFloat(saved);
        if (!isNaN(volume) && volume >= 0 && volume <= 1) {
          return volume;
        }
      }
    } catch (err) {
      console.warn('Failed to load volume:', err);
    }
    return 0.5; // Default volume 50%
  }

  /**
   * Event system for UI updates
   */
  listeners = {};

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  dispatchEvent(event, data = {}) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.warn('Event listener error:', err);
        }
      });
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    if (this.audio) {
      this.audio.src = '';
      this.audio = null;
    }
    this.listeners = {};
  }
}

// Export singleton instance
export default new AudioPlayer();
