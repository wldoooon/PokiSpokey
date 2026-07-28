export interface SearchResponse {
  total: number;
  hits: Clips[];
  aggregations?: Record<string, number>;
}

export interface Clips {
  video_id: string;
  sentence_text: string;
  start_time: number;
  end_time: number;
  position: number;
  category?: string;
  video_title?: string;
}

export enum ViewState {
  LANDING = "LANDING",
  SEARCHING = "SEARCHING",
  RESULTS = "RESULTS",
  PROFILE = "PROFILE",
  SAVED = "SAVED",
  PRICING = "PRICING",
}

export enum SearchCategory {
  ALL = "All",
  CODE = "Code",
  ACADEMIC = "Academic",
  NEWS = "News",
  CREATIVE = "Creative",
}

export enum SearchLanguage {
  ENGLISH = "en",
  SPANISH = "es",
  FRENCH = "fr",
  GERMAN = "de",
  JAPANESE = "ja",
  CHINESE = "zh",
}

export interface TranscriptLine {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptSentence {
  sentence_text: string;
  sentence_reading?: string;
  start_time: number;
  end_time: number;
  words?: { text: string; start: number; end: number }[];
}

export interface TranscriptResponse {
  video_id: string;
  start_time: number;
  end_time: number;
  sentences: TranscriptSentence[];
}

export interface PlayerState {
  currentVideoIndex: number;
  isMuted: boolean;
  activeTranscriptLine: number | null;
  currentTime: number;
}

export type PlayerAction =
  | { type: "NEXT_VIDEO" }
  | { type: "PREV_VIDEO" }
  | { type: "SET_MUTED"; payload: boolean }
  | { type: "SET_CURRENT_TIME"; payload: number }
  | { type: "SET_INDEX"; payload: number }
  | { type: "RESET_INDEX" };
