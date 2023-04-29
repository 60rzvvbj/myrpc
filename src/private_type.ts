export enum LikeType {
  Short = "short",
  Long = "long",
}

export interface CallInfo {
  type: LikeType;
  name: string;
}

export interface Request extends CallInfo {
  input: string;
}

export interface Response {
  flag: boolean;
  data: string;
}
