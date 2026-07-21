export interface User {
  id: string;
  name: string;
}

export interface ExperimentRun {
  id: string;
  metrics: Record<string, number>;
}
