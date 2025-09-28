
export enum Sender {
  User = 'user',
  Bot = 'bot',
}

export enum Sentiment {
  Positive = 'positive',
  Negative = 'negative',
  Neutral = 'neutral',
  Unknown = 'unknown'
}

export interface ChatMessage {
  id: number;
  sender: Sender;
  text: string;
  sentiment?: Sentiment;
}
