/**
 * Super Steve - Audio Module
 * 🎵 Retro 8-bit style music and sound effects
 * Inspired by classic platformers like Super Mario Bros.
 * 
 * Features:
 * - Background music with retro melody
 * - Jump sound
 * - Enemy defeat sound
 * - Coin collection sound
 * - Bonus pickup sound
 * - Level complete jingle
 * - Life lost sound
 * - Game over theme
 */

class SuperSteveAudio {
    constructor() {
        // Audio Context
        this.audioContext = null;
        this.masterGain = null;
        
        // Music state
        this.musicPlaying = false;
        this.musicInterval = null;
        this.currentNote = 0;
        
        // Volume settings
        this.masterVolume = 0.3;
        this.musicVolume = 0.04;  // 🔊 Halkabb zene!
        this.sfxVolume = 0.4;
        
        // Muted state
        this.musicMuted = false; // Only music mute
        this.muted = false; // Full mute (not used in normal gameplay)
        
        // Initialize audio context on first user interaction
        this.initialized = false;
        
        console.log('🎵 SuperSteveAudio initialized');
    }
    
    /**
     * Initialize audio context (must be called after user interaction)
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            this.initialized = true;
            console.log('✅ Audio context initialized');
        } catch (e) {
            console.error('❌ Failed to initialize audio:', e);
        }
    }
    
    /**
     * Create an oscillator node with envelope
     */
    createOscillator(frequency, duration, type = 'square', volume = 1.0) {
        if (!this.initialized) return null;
        // Note: SFX are NOT affected by musicMuted, only by full mute
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = type;
        osc.frequency.value = frequency;
        
        gain.gain.value = 0;
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        const now = this.audioContext.currentTime;
        
        // ADSR Envelope for retro sound
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * this.sfxVolume, now + 0.01);
        gain.gain.linearRampToValueAtTime(volume * this.sfxVolume * 0.7, now + duration * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
        
        return { osc, gain };
    }
    
    /**
     * Play a sequence of notes
     */
    playSequence(notes, callback) {
        if (!this.initialized) {
            if (callback) callback();
            return;
        }
        // Note: SFX sequences are NOT affected by musicMuted, only by full mute
        
        let time = 0;
        notes.forEach(note => {
            setTimeout(() => {
                if (note.freq > 0) {
                    this.createOscillator(note.freq, note.duration, note.type || 'square', note.volume || 1.0);
                }
            }, time * 1000);
            time += note.duration;
        });
        
        if (callback) {
            setTimeout(callback, time * 1000);
        }
    }
    
    /**
     * 🎵 BACKGROUND MUSIC - Retro platformer theme
     * Smooth, pleasant, looping melody
     */
    startBackgroundMusic() {
        if (!this.initialized || this.musicPlaying || this.musicMuted) return;
        
        this.musicPlaying = true;
        this.currentNote = 0;
        
        // 🎵 ÚJ ZENE - Mélyebb hangok (C3-G4 tartomány)
        // Kellemes, nyugodt retro platformer dallam
        const melody = [
            // Bar 1 - Gentle opening
            { freq: 261.63, duration: 0.20 }, // C4
            { freq: 293.66, duration: 0.20 }, // D4
            { freq: 329.63, duration: 0.20 }, // E4
            { freq: 261.63, duration: 0.20 }, // C4
            
            // Bar 2 - Response
            { freq: 329.63, duration: 0.20 }, // E4
            { freq: 293.66, duration: 0.20 }, // D4
            { freq: 261.63, duration: 0.40 }, // C4 (longer)
            
            // Bar 3 - Lower melody
            { freq: 196.00, duration: 0.20 }, // G3
            { freq: 220.00, duration: 0.20 }, // A3
            { freq: 246.94, duration: 0.20 }, // B3
            { freq: 261.63, duration: 0.20 }, // C4
            
            // Bar 4 - Calm resolve
            { freq: 293.66, duration: 0.20 }, // D4
            { freq: 261.63, duration: 0.20 }, // C4
            { freq: 196.00, duration: 0.40 }, // G3 (longer)
            
            // Bar 5 - Variation up
            { freq: 261.63, duration: 0.20 }, // C4
            { freq: 329.63, duration: 0.20 }, // E4
            { freq: 392.00, duration: 0.20 }, // G4
            { freq: 329.63, duration: 0.20 }, // E4
            
            // Bar 6 - Back down smooth
            { freq: 293.66, duration: 0.20 }, // D4
            { freq: 261.63, duration: 0.20 }, // C4
            { freq: 220.00, duration: 0.40 }, // A3 (longer)
            
            // Bar 7 - Final climb
            { freq: 246.94, duration: 0.20 }, // B3
            { freq: 261.63, duration: 0.20 }, // C4
            { freq: 293.66, duration: 0.20 }, // D4
            { freq: 329.63, duration: 0.20 }, // E4
            
            // Bar 8 - Peaceful ending
            { freq: 392.00, duration: 0.25 }, // G4
            { freq: 329.63, duration: 0.25 }, // E4
            { freq: 261.63, duration: 0.50 }  // C4 (longest)
        ];
        
        const playNote = () => {
            if (!this.musicPlaying) return;
            
            const note = melody[this.currentNote];
            
            // Create oscillator with softer settings for background music
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'square';
            osc.frequency.value = note.freq;
            
            gain.gain.value = this.musicVolume;
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            const now = this.audioContext.currentTime;
            osc.start(now);
            osc.stop(now + note.duration);
            
            // Move to next note
            this.currentNote = (this.currentNote + 1) % melody.length;
            
            // Schedule next note
            this.musicInterval = setTimeout(playNote, note.duration * 1000);
        };
        
        playNote();
        console.log('🎵 Background music started');
    }
    
    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
        console.log('🎵 Background music stopped');
    }
    
    /**
     * 🔊 JUMP SOUND
     */
    playJump() {
        if (!this.initialized) return;
        
        this.playSequence([
            { freq: 523.25, duration: 0.08, type: 'square', volume: 0.4 },
            { freq: 784.00, duration: 0.06, type: 'square', volume: 0.3 }
        ]);
    }
    
    /**
     * 💥 ENEMY DEFEAT SOUND
     */
    playEnemyDefeat() {
        if (!this.initialized) return;
        
        this.playSequence([
            { freq: 200, duration: 0.05, type: 'sawtooth', volume: 0.5 },
            { freq: 150, duration: 0.05, type: 'sawtooth', volume: 0.4 },
            { freq: 100, duration: 0.08, type: 'sawtooth', volume: 0.3 },
            { freq: 50, duration: 0.10, type: 'sawtooth', volume: 0.2 }
        ]);
    }
    
    /**
     * 🪙 COIN COLLECTION SOUND
     */
    playCoin() {
        if (!this.initialized) return;
        
        this.playSequence([
            { freq: 988, duration: 0.05, type: 'square', volume: 0.4 },
            { freq: 1319, duration: 0.08, type: 'square', volume: 0.3 }
        ]);
    }
    
    /**
     * 🎁 BONUS PICKUP SOUND
     */
    playBonus() {
        if (!this.initialized) return;
        
        this.playSequence([
            { freq: 523.25, duration: 0.06, type: 'triangle', volume: 0.4 },
            { freq: 659.25, duration: 0.06, type: 'triangle', volume: 0.4 },
            { freq: 784.00, duration: 0.06, type: 'triangle', volume: 0.4 },
            { freq: 1046.5, duration: 0.12, type: 'triangle', volume: 0.5 }
        ]);
    }
    
    /**
     * 🏁 LEVEL COMPLETE JINGLE
     */
    playLevelComplete() {
        if (!this.initialized) return;
        
        // Stop background music for the jingle
        const wasMusicPlaying = this.musicPlaying;
        this.stopBackgroundMusic();
        
        this.playSequence([
            { freq: 523.25, duration: 0.10, type: 'square', volume: 0.5 }, // C
            { freq: 659.25, duration: 0.10, type: 'square', volume: 0.5 }, // E
            { freq: 784.00, duration: 0.10, type: 'square', volume: 0.5 }, // G
            { freq: 1046.5, duration: 0.10, type: 'square', volume: 0.5 }, // C
            { freq: 784.00, duration: 0.10, type: 'square', volume: 0.5 }, // G
            { freq: 1046.5, duration: 0.30, type: 'square', volume: 0.6 }  // C (long)
        ], () => {
            // Resume background music after jingle
            if (wasMusicPlaying) {
                setTimeout(() => this.startBackgroundMusic(), 500);
            }
        });
    }
    
    /**
     * 💔 LIFE LOST SOUND
     */
    playLifeLost() {
        if (!this.initialized) return;
        
        this.playSequence([
            { freq: 392, duration: 0.15, type: 'triangle', volume: 0.5 },
            { freq: 330, duration: 0.15, type: 'triangle', volume: 0.4 },
            { freq: 262, duration: 0.20, type: 'triangle', volume: 0.3 }
        ]);
    }
    
    /**
     * 💀 GAME OVER THEME
     */
    playGameOver() {
        if (!this.initialized) return;
        
        // Stop background music
        this.stopBackgroundMusic();
        
        this.playSequence([
            { freq: 523.25, duration: 0.20, type: 'triangle', volume: 0.5 }, // C
            { freq: 493.88, duration: 0.20, type: 'triangle', volume: 0.5 }, // B
            { freq: 440.00, duration: 0.20, type: 'triangle', volume: 0.5 }, // A
            { freq: 392.00, duration: 0.20, type: 'triangle', volume: 0.5 }, // G
            { freq: 349.23, duration: 0.20, type: 'triangle', volume: 0.5 }, // F
            { freq: 329.63, duration: 0.20, type: 'triangle', volume: 0.5 }, // E
            { freq: 293.66, duration: 0.20, type: 'triangle', volume: 0.5 }, // D
            { freq: 261.63, duration: 0.50, type: 'triangle', volume: 0.6 }  // C (long)
        ]);
    }
    
    /**
     * 🎵 FOOTSTEP SOUND (very subtle)
     */
    playStep() {
        if (!this.initialized) return;
        
        // Very quiet, low frequency footstep
        this.playSequence([
            { freq: 150, duration: 0.04, type: 'triangle', volume: 0.2 }
        ]);
    }
    
    /**
     * Toggle music mute (only affects background music, NOT sound effects)
     */
    toggleMusicMute() {
        this.musicMuted = !this.musicMuted;
        
        if (this.musicMuted) {
            this.stopBackgroundMusic();
        } else {
            this.startBackgroundMusic();
        }
        
        console.log(`🔇 Background Music ${this.musicMuted ? 'MUTED' : 'UNMUTED'}`);
        return this.musicMuted;
    }
    
    /**
     * Toggle full mute (all sounds)
     */
    toggleMute() {
        this.muted = !this.muted;
        
        if (this.muted) {
            this.stopBackgroundMusic();
        }
        
        console.log(`🔇 All Audio ${this.muted ? 'MUTED' : 'UNMUTED'}`);
        return this.muted;
    }
    
    /**
     * Set master volume (0.0 - 1.0)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        console.log(`🔊 Master volume: ${Math.round(this.masterVolume * 100)}%`);
    }
    
    /**
     * Set music volume (0.0 - 1.0)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        console.log(`🎵 Music volume: ${Math.round(this.musicVolume * 100)}%`);
    }
    
    /**
     * Set SFX volume (0.0 - 1.0)
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        console.log(`🔊 SFX volume: ${Math.round(this.sfxVolume * 100)}%`);
    }
}

// Export for use in main game
window.SuperSteveAudio = SuperSteveAudio;
console.log('🎵 SuperSteveAudio module loaded - Retro 8-bit sound system ready!');
