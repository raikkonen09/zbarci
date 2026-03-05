'use client';
import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'roll' | 'bank' | 'zbarci' | 'select' | 'win';

export function useSoundEffects() {
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Initialize on mount to comply with browser autoplay policies (needs user interaction though)
    useEffect(() => {
        const initAudio = () => {
            if (!audioCtxRef.current) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    audioCtxRef.current = new AudioContextClass();
                }
            }
        };

        window.addEventListener('click', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });

        return () => {
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
    }, []);

    const playSound = useCallback((type: SoundType) => {
        try {
            if (!audioCtxRef.current) return;

            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            const now = ctx.currentTime;

            switch (type) {
                case 'select':
                    // Short high ping
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
                    gainNode.gain.setValueAtTime(0.3, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                    osc.start(now);
                    osc.stop(now + 0.05);
                    break;

                case 'roll':
                    // Clattering sound
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.linearRampToValueAtTime(500, now + 0.1);
                    osc.frequency.linearRampToValueAtTime(300, now + 0.2);
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;

                case 'bank':
                    // Happy chime / coin
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523.25, now); // C5
                    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;

                case 'zbarci':
                    // Sad descending tone
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                    gainNode.gain.setValueAtTime(0.2, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    osc.start(now);
                    osc.stop(now + 0.4);
                    break;

                case 'win':
                    // Arpeggio up
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.setValueAtTime(554.37, now + 0.1);
                    osc.frequency.setValueAtTime(659.25, now + 0.2);
                    osc.frequency.setValueAtTime(880, now + 0.3);
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
                    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.3);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
                    osc.start(now);
                    osc.stop(now + 0.8);
                    break;
            }
        } catch (err) {
            console.error('Audio playback failed', err);
        }
    }, []);

    return playSound;
}
