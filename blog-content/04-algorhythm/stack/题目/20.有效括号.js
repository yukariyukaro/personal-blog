var isValid = function (s) {
    
    const map = new Map([
        ['(', ')'],
        ['[', ']'],
        ['{', '}'],
    ]);
    const stack = [];
    for (let i=0;i<s.length;i++) {
        const char = s[i];
        // map.has查询是否为左括号
        if (map.has(char)) {
            stack.push(char);
        } else {
            // top为
            const top = stack.pop();
            if (map.get(top) !== char) {
                return false;
            }
        }
    }
    return stack.length === 0;
};
console.log(isValid('()'));