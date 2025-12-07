/**
 * Snake Game - Audio Module
 * 🎵 Retro 8-bit style music and sound effects for Snake
 * 
 * Features:
 * - Background music with energetic retro melody
 * - Movement sound (subtle)
 * - Food collection sound
 * - Game over theme (same as Super Steve)
 * - Music mute toggle (only affects background music, NOT sound effects!)
 */

class SnakeAudio {
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
        this.musicVolume = 0.05;  // 🔊 Háttérzene hangereje
        this.sfxVolume = 0.4;
        
        // Muted state
        this.musicMuted = false; // Only music mute - SFX still play!
        
        // Initialize audio context on first user interaction
        this.initialized = false;
        
        console.log('🎵 SnakeAudio initialized');
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
            console.log('✅ Snake Audio context initialized');
        } catch (e) {
            console.error('❌ Failed to initialize Snake audio:', e);
        }
    }
    
    /**
     * Create an oscillator node with envelope
     * ⚠️ CRITICAL: SFX are NOT affected by musicMuted flag!
     */
    createOscillator(frequency, duration, type = 'square', volume = 1.0) {
        if (!this.initialized) return null;
        // Note: SFX are NOT affected by musicMuted, only background music is!
        
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
     * ⚠️ CRITICAL: SFX sequences are NOT affected by musicMuted!
     */
    playSequence(notes, callback) {
        if (!this.initialized) {
            if (callback) callback();
            return;
        }
        // SFX are NOT affected by musicMuted
        
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
     * 🎵 BACKGROUND MUSIC - Energetic retro console game theme!
     * Dinamikus, játékos, fülbemászó 8-bit dallam (C4-E5 tartomány)
     * Emlékeztet a klasszikus Game Boy és NES játékokra
     */
    startBackgroundMusic() {
        if (!this.initialized || this.musicPlaying || this.musicMuted) return;
        
        this.musicPlaying = true;
        this.currentNote = 0;
        
        // 🎵 RETRO CONSOLE GAME MUSIC - Energetic, catchy melody
        // Gyors tempó, fülbemászó dallam, klasszikus 8-bit vibe
        const melody = [
            // Bar 1 - Energetic opening
            { freq: 523.25, duration: 0.15 }, // C5
            { freq: 659.25, duration: 0.15 }, // E5
            { freq: 784.00, duration: 0.15 }, // G5
            { freq: 659.25, duration: 0.15 }, // E5
            
            // Bar 2 - Quick response
            { freq: 523.25, duration: 0.15 }, // C5
            { freq: 587.33, duration: 0.15 }, // D5
            { freq: 523.25, duration: 0.30 }, // C5 (longer)
            
            // Bar 3 - Jump up
            { freq: 392.00, duration: 0.15 }, // G4
            { freq: 523.25, duration: 0.15 }, // C5
            { freq: 659.25, duration: 0.15 }, // E5
            { freq: 523.25, duration: 0.15 }, // C5
            
            // Bar 4 - Down pattern
            { freq: 493.88, duration: 0.15 }, // B4
            { freq: 440.00, duration: 0.15 }, // A4
            { freq: 392.00, duration: 0.30 }, // G4 (longer)
            
            // Bar 5 - Climb again
            { freq: 523.25, duration: 0.12 }, // C5
            { freq: 587.33, duration: 0.12 }, // D5
            { freq: 659.25, duration: 0.12 }, // E5
            { freq: 698.46, duration: 0.12 }, // F5
            { freq: 784.00, duration: 0.12 }, // G5
            
            // Bar 6 - Peak and fall
            { freq: 880.00, duration: 0.15 }, // A5
            { freq: 784.00, duration: 0.15 }, // G5
            { freq: 659.25, duration: 0.30 }, // E5 (longer)
            
            // Bar 7 - Descending run
            { freq: 784.00, duration: 0.10 }, // G5
            { freq: 698.46, duration: 0.10 }, // F5
            { freq: 659.25, duration: 0.10 }, // E5
            { freq: 587.33, duration: 0.10 }, // D5
            { freq: 523.25, duration: 0.10 }, // C5
            { freq: 493.88, duration: 0.10 }, // B4
            
            // Bar 8 - Resolution
            { freq: 523.25, duration: 0.20 }, // C5
            { freq: 392.00, duration: 0.20 }, // G4
            { freq: 523.25, duration: 0.40 }  // C5 (ending)
        ];
        
        const playNote = () => {
            if (!this.musicPlaying) return;
            
            const note = melody[this.currentNote];
            
            // Create oscillator with retro square wave
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'square'; // Classic 8-bit square wave!
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
        console.log('🎵 Snake background music started - Retro console style!');
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
        console.log('🎵 Snake background music stopped');
    }
    
    /**
     * 🐍 MOVEMENT SOUND - Very subtle tick sound when snake moves
     */
    playMove() {
        if (!this.initialized) return;
        
        // Very quiet, very short tick
        this.playSequence([
            { freq: 200, duration: 0.02, type: 'square', volume: 0.15 }
        ]);
    }
    
    /**
     * 🍎 FOOD COLLECTION SOUND - Satisfying pickup sound
     */
    playFood() {
        if (!this.initialized) return;
        
        this.playSequence([
            { freq: 659.25, duration: 0.06, type: 'square', volume: 0.4 },
            { freq: 880.00, duration: 0.08, type: 'square', volume: 0.35 }
        ]);
    }
    
    /**
     * 💀 GAME OVER THEME - Ugyanaz, mint a Super Steve-nél!
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
     * Toggle music mute (only affects background music, NOT sound effects!)
     */
    toggleMusicMute() {
        this.musicMuted = !this.musicMuted;
        
        if (this.musicMuted) {
            this.stopBackgroundMusic();
        } else {
            this.startBackgroundMusic();
        }
        
        console.log(`🔇 Snake Music ${this.musicMuted ? 'MUTED' : 'UNMUTED'} (SFX still play!)`);
        return this.musicMuted;
    }
    
    /**
     * Check if music is muted
     */
    isMusicMuted() {
        return this.musicMuted;
    }
    
    /**
     * Set master volume (0.0 - 1.0)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        console.log(`🔊 Snake Master volume: ${Math.round(this.masterVolume * 100)}%`);
    }
    
    /**
     * Set music volume (0.0 - 1.0)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        console.log(`🎵 Snake Music volume: ${Math.round(this.musicVolume * 100)}%`);
    }
    
    /**
     * Set SFX volume (0.0 - 1.0)
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        console.log(`🔊 Snake SFX volume: ${Math.round(this.sfxVolume * 100)}%`);
    }
}

// Export for use in Snake game
window.SnakeAudio = SnakeAudio;
console.log('🎵 SnakeAudio module loaded - Retro 8-bit sound system ready for Snake!');
