import { Platform } from 'react-native';

type VoiceHandlers = {
  onTranscript: (text: string, final: boolean) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const anyWindow = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = anyWindow.SpeechRecognition ?? anyWindow.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

export function voiceAvailable(): boolean {
  return Platform.OS === 'web' && getRecognition() !== null;
}

/**
 * Voice is routed into the same text field as typing, and the recognised text
 * is shown before it is sent. Native voice input needs a development build with
 * a speech-recognition module, so it is not simulated here.
 */
export function startVoice(handlers: VoiceHandlers): (() => void) | null {
  const recognition = getRecognition();
  if (!recognition) return null;
  recognition.lang = 'en-GB';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event: any) => {
    let transcript = '';
    let final = false;
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) final = true;
    }
    handlers.onTranscript(transcript.trim(), final);
  };
  recognition.onerror = (event: any) => {
    const reason = event?.error === 'not-allowed' ? 'microphone access was blocked.' : 'i couldn’t hear that.';
    handlers.onError?.(reason);
    handlers.onEnd?.();
  };
  recognition.onend = () => handlers.onEnd?.();
  try {
    recognition.start();
  } catch {
    handlers.onError?.('voice input is already running.');
    return null;
  }
  return () => {
    try {
      recognition.abort();
    } catch {
      // already stopped
    }
  };
}
