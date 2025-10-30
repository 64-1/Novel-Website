# Music Playback Feature

## Overview

The music playback feature provides ambient background music for the Writer Studio to help creators stay focused and inspired while writing.

## Features

- ✅ **3 Mood-Based Tracks**
  - 环绕 · 深夜漂流 (Ambient - Night Drift)
  - Lo-Fi · 城市光影 (Lo-Fi - City Lights)
  - 钢琴 · 温柔晨光 (Piano - Gentle Morning Light)

- ✅ **Playback Controls**
  - Play/Pause toggle
  - Automatic looping
  - Track switching
  - Visual feedback (button changes color when playing)

- ✅ **Volume Control**
  - Smooth volume slider (0-100%)
  - Persistent volume settings (saved to localStorage)
  - Real-time volume adjustment

- ✅ **State Persistence**
  - Remembers last selected track
  - Saves volume preference
  - Loads previous state on page refresh

## Usage

1. Navigate to the Writer Studio (`/write/`)
2. Locate the "写作音乐频道" (Writing Music Channel) card in the sidebar
3. Select your desired mood from the dropdown
4. Click "播放预设" (Play Preset) to start playback
5. Adjust volume using the slider
6. Click "暂停播放" (Pause Playback) to pause

## Technical Implementation

### Architecture

- **AudioPlayer Service** (`js/services/AudioPlayer.js`)
  - Singleton service managing audio playback
  - Event-based system for UI synchronization
  - localStorage integration for persistence

- **UI Integration** (`js/app/initApp.js`)
  - Button state management
  - Volume control handling
  - Toast notifications for user feedback

- **Styling** (`styles.css`)
  - Playing state animation (green pulsing gradient)
  - Volume slider with custom thumb
  - Dark mode support

### Audio Sources

Currently using royalty-free music from Pixabay CDN:
- Ambient: Space ambient soundscape
- Lo-Fi: Study/focus beats
- Piano: Gentle piano melodies

### Customization

To replace audio tracks with your own:

1. Update the `tracks` object in `AudioPlayer.js`:
```javascript
this.tracks = {
  ambient: {
    name: '环绕 · 深夜漂流',
    url: '/audio/your-ambient-track.mp3'  // Your custom URL
  },
  lofi: {
    name: 'Lo-Fi · 城市光影',
    url: '/audio/your-lofi-track.mp3'
  },
  piano: {
    name: '钢琴 · 温柔晨光',
    url: '/audio/your-piano-track.mp3'
  }
};
```

2. Place your audio files in an `/audio/` directory
3. Update service worker to cache audio files (optional for offline support)

### API Reference

**AudioPlayer Methods:**
- `play(trackId)` - Play specified track
- `pause()` - Pause current playback
- `stop()` - Stop and reset playback
- `toggle(trackId)` - Toggle play/pause for track
- `setVolume(level)` - Set volume (0.0 - 1.0)
- `getVolume()` - Get current volume
- `getIsPlaying()` - Check if playing
- `getCurrentTrack()` - Get current track ID

**Events:**
- `play` - Fired when playback starts
- `pause` - Fired when playback pauses
- `error` - Fired on playback error
- `volumechange` - Fired when volume changes

### Browser Compatibility

- Modern browsers with HTML5 Audio API support
- Chrome, Firefox, Safari, Edge (latest versions)
- Autoplay may require user interaction (handled by button click)

## Future Enhancements

Potential improvements:
- [ ] Add more music tracks
- [ ] Integrate with Spotify/Apple Music API
- [ ] Add playlist creation
- [ ] Implement crossfade between tracks
- [ ] Add audio visualization
- [ ] Keyboard shortcuts for playback control
- [ ] Global music player (persist across pages)

## License

Audio files are sourced from Pixabay and are royalty-free. Attribution requirements may apply based on your deployment.

## Troubleshooting

**Music doesn't play:**
- Check browser console for errors
- Verify audio URLs are accessible
- Ensure autoplay is allowed (user interaction required)
- Check volume is not at 0%

**Volume not persisting:**
- Verify localStorage is enabled
- Check browser privacy settings
- Clear cache and reload

**Button stuck in "playing" state:**
- Refresh the page
- Check browser console for errors
- Verify AudioPlayer events are firing correctly
