
export type Tone = 'urgente' | 'celebratorio' | 'informativo';

export interface FormData {
  topic: string;
  keyFacts: string;
  quote: string;
  spokesperson: string;
  callToAction: string;
  contactInfo: string;
  tone: Tone;
  location: string;
  releaseDate: string;
}

export interface GenerationOptions {
  generateSocialPosts: boolean;
  language: 'ES' | 'EN';
}
