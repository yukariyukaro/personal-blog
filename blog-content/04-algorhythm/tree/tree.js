//二叉树遍历
//144. 前序遍历
/* 数组表示下的二叉树类 */
function TreeNode(val, left = null, right = null) {
  this.val = val;
  this.left = left;
  this.right = right;
}
const preorderTraversal = function(root) {
    const res = [];
  function dfs(node) {
    if (!node) return;
    res.push(node.val);
    dfs(node.left);
    dfs(node.right);
  }
  dfs(root);
  return res;
};
function buildTreeFromArray(arr) {
  if (!arr || arr.length === 0) return null;
  let nodes=[];
  for(let i=0;i<arr.length;i++){
    if(arr[i]!==null){
      nodes.push(new TreeNode(arr[i]));
    }else{
      nodes.push(null);
    }
  }
  
  console.log(nodes);
  return nodes[0];
}
buildTreeFromArray([1,null,2,3]);
