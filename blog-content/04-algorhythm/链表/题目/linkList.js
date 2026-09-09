// 错题：leetcode23 合并K个升序链表（原注释误写为19，19是删除链表倒数第N个节点）
// 分治思想：将K个链表两两配对合并，直到合并成一个链表（类似归并排序的"合并"阶段）

// 链表节点定义
function ListNode(val, next) {
  this.val = val === undefined ? 0 : val;
  this.next = next === undefined ? null : next;
}

// 双指针合并两个有序链表（O(m+n)）
function mergeTwoLists(l1, l2) {
  const dummy = new ListNode(0);
  let cur = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) {
      cur.next = l1;
      l1 = l1.next;
    } else {
      cur.next = l2;
      l2 = l2.next;
    }
    cur = cur.next;
  }
  // 剩余部分本身有序，直接拼接
  cur.next = l1 || l2;
  return dummy.next;
}

// 递归分治合并：每次把区间 [left,right] 分成两半，分别合并后再两两合并
// 时间复杂度 O(N·logK)（N为节点总数，K为链表个数），空间复杂度 O(logK)（递归栈）
function mergeKLists(lists) {
  if (!lists || lists.length === 0) return null;
  return mergeRange(lists, 0, lists.length - 1);
}
function mergeRange(lists, left, right) {
  if (left === right) return lists[left]; // 区间只有一个链表，直接返回
  const mid = (left + right) >> 1;
  const l1 = mergeRange(lists, left, mid);      // 左半合并结果
  const l2 = mergeRange(lists, mid + 1, right); // 右半合并结果
  return mergeTwoLists(l1, l2);                 // 合并左右两个"大链表"
}

// 迭代分治合并（自底向上）：空间复杂度 O(1)，无需递归栈
function mergeKListsIterative(lists) {
  if (!lists || lists.length === 0) return null;
  let interval = 1; // 每次配对的间隔
  while (interval < lists.length) {
    for (let i = 0; i + interval < lists.length; i += interval * 2) {
      lists[i] = mergeTwoLists(lists[i], lists[i + interval]);
    }
    interval *= 2;
  }
  return lists[0];
}

// 测试：lists = [[1,4,5],[1,3,4],[2,6]] => [1,1,2,3,4,4,5,6]
function arrToList(arr) {
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const v of arr) {
    cur.next = new ListNode(v);
    cur = cur.next;
  }
  return dummy.next;
}
function listToArr(head) {
  const res = [];
  while (head) {
    res.push(head.val);
    head = head.next;
  }
  return res;
}
const lists = [[1, 4, 5], [1, 3, 4], [2, 6]].map(arrToList);
console.log(listToArr(mergeKLists(lists)));        // [1,1,2,3,4,4,5,6]
console.log(mergeKListsIterative([]));             // null（空数组）
console.log(listToArr(mergeKListsIterative([[]].map(arrToList)))); // []
