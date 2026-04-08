export interface Story {
  id: number;
  title: string;
  summary: string;
  score: number;
  source: string;
  published_at: string;
}

export interface StoryComplete extends Story {
  quality: {
    readability: number;
    originality: number;
  };
  content: {
    twitter?: string;
    linkedin?: string;
    blog?: string;
  };
}
