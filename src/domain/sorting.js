/**
 * Merge Sort implementation.
 * Rules: Must be stable, must return a NEW array, must not mutate inputs.
 */
export function mergeSort(items, compare) {
  // Base case: arrays of length 0 or 1 are already sorted
  if (items.length <= 1) return [...items]; 

  const mid = Math.floor(items.length / 2);
  
  // Recursively split the array into left and right halves
  const left = mergeSort(items.slice(0, mid), compare);
  const right = mergeSort(items.slice(mid), compare);

  return merge(left, right, compare);
}

function merge(left, right, compare) {
  const result = [];
  let leftIndex = 0;
  let rightIndex = 0;

  // Compare elements from left and right arrays
  while (leftIndex < left.length && rightIndex < right.length) {
    // STABILITY RULE: If compare returns <= 0, we take from the LEFT array first.
    // This ensures that equal items keep their original relative order.
    if (compare(left[leftIndex], right[rightIndex]) <= 0) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }

  // If one array is exhausted, append the rest of the other array
  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}