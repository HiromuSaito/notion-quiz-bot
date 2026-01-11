export interface NotionNote {
  id: string;
  title: string;
  content: string;
  lastEdited: Date;
}

export interface Question {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  noteTitle: string;
  questions: Question[];
}
