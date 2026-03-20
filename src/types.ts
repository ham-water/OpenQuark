export type SearchInput = {
  rawQuery: string;
  goal: string;
  domain?: string;
  possibleTechs: string[];
  searchQueries: string[];
};

export type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
  source: string;
};
