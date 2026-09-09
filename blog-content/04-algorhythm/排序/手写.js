function bubble_sort(a){
    for (let i=0;i<nums.length-1;i++){
        for (let j=0;j<nums.length-1-i;j++){
            if (a[j]>a[j+1]){
                tmp = a[j+1];
                a[j+1] = a[j];
                a[j] = tmp;
            }
        }
}
function select_sort(a){
    for (let i =0;i<nums.length-1;i++){
        for (let j=i+1;j<nums.length-1;j++){
            if (a[j]<a[i]){
                let tmp =a[i];
                a[i] = a[j];
                a[j] = tmp;
            }
        }
    }
}
// 插入排序
// 左侧有序数组：0到i  i+1到n-1无须
// 要求：
function insert_sort(a){
    let len = nums.length;
    for (let i=1;i<len-1;i++){
        preIndex = i-1;
        let current = a[i];
        while(preIndex>=0&&current<a[preIndex]){
            a[preIndex+1] = a[preIndex];
            preIndex--;     
        }      
    }
}
