export interface StudentProfile {
  level: 'school' | 'undergrad' | 'grad' | 'expert';
  learning_style: 'visual' | 'textual' | 'applied' | 'mixed';
  goals: ('exam' | 'revision' | 'deep_understanding')[];
}

export interface Preferences {
  summary_length: 'short' | 'medium' | 'long';
  flashcards: {
    enabled: boolean;
    density: 'key_concepts' | 'detailed';
    count: number;
  };
  quiz: {
    enabled: boolean;
    depth: 'quick_check' | 'challenging';
    count: number;
  };
  study_plan: {
    enabled: boolean;
    weeks: number;
  };
}

export interface Flashcard {
  id: string;
  q: string;
  a: string;
  tags: string[];
  confidence: number;
  source_time?: string;
}

export interface QuizQuestion {
  id: string;
  q: string;
  options: string[];
  answer_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  confidence: number;
}

export interface StudyPlanTask {
  day: number;
  task: string;
  time_mins: number;
}

export interface GlossaryTerm {
    term: string;
    definition: string;
}

export interface Summary {
  title: string;
  tl_dr: string;
  short: string;
  medium: string;
  long: string;
  glossary: GlossaryTerm[];
}

export interface StudyPlan {
  total_weeks: number;
  schedule: StudyPlanTask[];
}

export interface StudyOutput {
  summary: Summary;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  study_plan: StudyPlan;
}

export type InputType = 'text' | 'url' | 'file';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
