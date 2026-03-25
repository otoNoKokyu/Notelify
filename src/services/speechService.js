import { io } from 'socket.io-client';

// Auto-detect WebSocket URL from current page origin (works with localhost, ngrok, or any host)
// Vite proxy handles forwarding /speech namespace to localhost:3000 during dev
const WS_URL = import.meta.env.VITE_WS_URL
    || (typeof window !== 'undefined'
        ? `${window.location.origin}/speech`
        : 'ws://localhost:3000/speech');

let socket = null;
let audioContext = null;
let mediaStream = null;
let processor = null;
let globalSource = null;
let isActive = false;

/**
 * Downsample a Float32Array from one sample rate to another.
 * Uses simple point-sampling which is adequate for speech audio.
 */
function downsample(buffer, fromRate, toRate) {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        result[i] = buffer[Math.round(i * ratio)];
    }
    return result;
}

export const speechService = {
    async startTranscription(onPartial, onFinal, onError, onComplete) {
        this.stopTranscription(); // Ensure complete cleanup of any previous session first

        isActive = true;

        // 1. Immediately request microphone access so the UI doesn't hang waiting for websockets
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            if (onError) onError('Microphone access denied or error: ' + err.message);
            this.stopTranscription();
            return;
        }

        // Potential race condition: user clicked stop while waiting for permission
        if (!isActive) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
            return;
        }

        // Note: most browsers ignore the sampleRate hint and use the hardware's native rate.
        // We downsample manually in the onaudioprocess handler below.
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        globalSource = audioContext.createMediaStreamSource(mediaStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        globalSource.connect(processor);
        processor.connect(audioContext.destination);

        // Bug #3 fix: Attach audio handler immediately (outside the connect callback).
        // The handler guards on socket.connected internally, so chunks are only sent
        // when the socket is actually connected.
        processor.onaudioprocess = (e) => {
            if (!isActive || !socket || !socket.connected) return;

            const rawInput = e.inputBuffer.getChannelData(0);
            // Bug #5 fix: Downsample from whatever rate the browser actually uses to 16 kHz
            const inputData = downsample(rawInput, audioContext.sampleRate, 16000);
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            socket.emit('audio-chunk', pcmData.buffer);
        };

        // 2. Start Socket connection AFTER hardware is ready
        socket = io(WS_URL, {
            path: '/socket.io',
            transports: ['polling', 'websocket'],
            namespace: '/speech',
            extraHeaders: {
                'ngrok-skip-browser-warning': 'true',
                'Bypass-Tunnel-Reminder': 'true'
            }
        });

        socket.on('connect', () => {
            if (!isActive) {
                socket.disconnect();
                return;
            }

            socket.emit('start-transcription', { languageCode: 'en-US', sampleRate: 16000 });
        });

        socket.on('connect_error', (error) => {
            console.warn('Socket connection error (ngrok might be negotiating):', error);
            // Don't auto-stop on first connection error, let socket.io retry
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            if (reason === 'io server disconnect') {
                // The server forcefully disconnected us.
                if (onComplete) onComplete();
                this.stopTranscription();
            }
            // If reason is transport close / ping timeout, Socket.io will auto-reconnect.
            // DO NOT stop the transcription UI eagerly.
        });

        socket.on('transcript-partial', (data) => onPartial && onPartial(data.transcript));
        socket.on('transcript-final', (data) => onFinal && onFinal(data.transcript));
        socket.on('transcript-error', (data) => {
            if (onError) {
                const msg = data ? (data.message || data) : 'Unknown error';
                onError(msg);
            }
            this.stopTranscription();
        });
        socket.on('transcription-complete', () => {
            if (onComplete) onComplete();
            this.stopTranscription();
        });
    },

    stopTranscription() {
        isActive = false;

        if (socket) {
            // Bug #1 fix: Capture the reference before nulling so the delayed
            // disconnect won't clobber a newly created socket from a rapid toggle.
            const socketToClose = socket;
            socket = null;

            if (socketToClose.connected) {
                socketToClose.emit('stop-transcription');
            }
            setTimeout(() => {
                socketToClose.disconnect();
            }, 100);
        }

        if (processor) {
            processor.disconnect();
            processor = null;
        }
        if (globalSource) {
            globalSource.disconnect();
            globalSource = null;
        }
        if (audioContext) {
            if (audioContext.state !== 'closed') {
                audioContext.close().catch(console.error);
            }
            audioContext = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
    }
};
