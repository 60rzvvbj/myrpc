export function getPromise<T>(): [Promise<T>, (value: T) => void] {
  let r: (value: T) => void;
  let p: Promise<T> = new Promise((resolve) => {
    r = resolve;
  });
  return [p, r!];
}
