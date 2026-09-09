// 215 
var findKthLargest = function(nums, k) {
  const target = nums.length - k; // 转为第 target 小元素的下标 (0-based)

  function select(arr, t) {
    if (arr.length === 1) return arr[0];

    const pivot = arr[Math.floor(Math.random() * arr.length)];
    const left = [];
    const mid = [];
    const right = [];

    for (let v of arr) {
      if (v < pivot) left.push(v);
      else if (v === pivot) mid.push(v);
      else right.push(v);
    }

    if (t < left.length) {
      return select(left, t);
    } else if (t < left.length + mid.length) {
      return pivot;
    } else {
      return select(right, t - left.length - mid.length);
    }
  }

  return select(nums, target);
};
