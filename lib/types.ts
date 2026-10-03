export type Citation = {
  number: number;
  title_th: string;
  edition_year_be: number;
  page_number: number | null;
  section: string | null;
  source: string;
  score: number;
};

export type AskResponse = {
  answer: string;
  citations: Citation[];
};
