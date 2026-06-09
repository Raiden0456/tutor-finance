// Detects the video-call provider from a meeting URL so clients can label the
// Join button (e.g. "Zoom"). Shared by web and mobile.

interface Provider {
  name: string;
  patterns: RegExp[];
}

const PROVIDERS: Provider[] = [
  { name: 'Zoom', patterns: [/zoom\.us/i] },
  { name: 'Google Meet', patterns: [/meet\.google\.com/i] },
  { name: 'Microsoft Teams', patterns: [/teams\.microsoft\.com/i, /teams\.live\.com/i] },
  { name: 'Yandex Telemost', patterns: [/telemost\.yandex\.ru/i] },
  { name: 'Whereby', patterns: [/whereby\.com/i] },
  { name: 'Jitsi', patterns: [/meet\.jit\.si/i] },
  { name: 'Webex', patterns: [/webex\.com/i] },
];

export function detectMeetingProvider(url: string): string | null {
  for (const provider of PROVIDERS) {
    if (provider.patterns.some((re) => re.test(url))) return provider.name;
  }
  return null;
}
