const flatArray = [
  { id: 1, parentId: null, name: 'root1' },
  { id: 2, parentId: 1, name: 'child1' },
  { id: 3, parentId: 1, name: 'child2' },
  { id: 4, parentId: 2, name: 'grandchild1' },
  { id: 5, parentId: 3, name: 'grandchild2' },
];
function arrryToTree(flatArray){
    let map = new Map();
    for (let item of flatArray){
        map.set(item.id,{...item,children:[]});
    }
    function buildTree(node){
        for (let item of flatArray){
            if(item.parentId === node.id){
                let childNode = map.get(item.id);
                buildTree(childNode);
                node.children.push(childNode);
            }
        }
        return node;
    }
    return flatArray.filter(item=>item.parentId === null).map(item=>buildTree(item));
}
function retryWithTimeout(fn, retries, timeout) {
    return new Promise((resolve, reject) => {
        const retry = async (attempt) => {
            try {
                const result = await fn();
                resolve(result);
            } catch (error) {
                if (attempt < retries) {
                    setTimeout(() => {
                        retry(attempt + 1);
                    }, timeout);
                } else {
                    reject("Exceeded maximum retries");
                }
            }
        };
 
        retry(0);
    });
}
// 考虑指数退避：