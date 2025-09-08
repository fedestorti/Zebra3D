export function groupBy(arr, keyFn) {
  return arr.reduce((acc, el) => {
    const k = keyFn(el);
    (acc[k] ||= []).push(el);
    return acc;
  }, {});
}
