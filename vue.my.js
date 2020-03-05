(function (global, factory) {
    console.log("start")
    global.Vue = factory()
})(this, (function () {

    const unicodeLetters = 'a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD'
    // Regular Expressions for parsing tags and attributes
    const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
    const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeLetters}]*`;
    const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
    const startTagOpen = new RegExp(`^<${qnameCapture}`);
    const startTagClose = /^\s*(\/?)>/;
    const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
    const doctype = /^<!DOCTYPE [^>]+>/i;
    const comment = /^<!\--/;
    const conditionalComment = /^<!\[/;

    function Vue(options) {
        test(options.el)
    }

    function test(el) {
        let rootNode = document.querySelector(el)
        let html = rootNode.outerHTML
        const ast = parseHTML(html.trim())
        console.log(ast)
        const code = generate(ast)
    }

    /**
     * 将html解析成ast
     */
    function parseHTML(html) {
        let root = null
        const stack = [] // 栈 存储ast元素
        function currentParent() { return stack[stack.length - 1] }
        let index = 0    // html解析游标

        while (html) {
            let textEnd = html.indexOf('<')
            //  标签或注释之前的文本 
            if (textEnd > 0) {
                // 标签之前有文本
                const text = html.substring(0, textEnd)
                advance(text.length)
                const textAst = {
                    type: 2,
                    text
                }
                currentParent().children.push(textAst)
                continue
            }
            // 如果是注释
            if (comment.test(html)) {
                const commentEnd = html.indexOf('-->')
                if (commentEnd >= 0) {
                    const commentAst = {
                        type: 3,
                        text: html.substring(4, commentEnd),
                        isComment: true
                    }
                    currentParent().children.push(commentAst)
                    advance(commentEnd + 3)
                    continue
                }
            }
            // 如果是关闭标签 currentParent()应该就是与之匹配的标签 
            const endTagMatch = html.match(endTag)
            if (endTagMatch) {
                advance(endTagMatch[0].length)
                if (currentParent().tag !== endTagMatch[1]) {
                    warn("end tag not match")
                }
                stack.pop()
            }

            // 如果是开始标签 
            const startTagMatch = html.match(startTagOpen) // <div
            if (startTagMatch) {
                advance(startTagMatch[0].length)
                const attrs = []
                // 解析标签属性直到标签闭合
                let end, attr;
                while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
                    const attrMatch = {
                        name: attr[1],
                        value: attr[3] || attr[4] || attr[5] || '',
                    }
                    advance(attr[0].length);
                    attrs.push(attrMatch);
                }
                if (end) {
                    advance(end[0].length)
                } else {
                    warn("no end")
                }
                const tagAst = {
                    type: 1,
                    tag: startTagMatch[1],
                    attrsList: attrs,
                    attrsMap: makeAttrsMap(attrs),
                    children: [],
                    parent: currentParent()
                }
                if (stack.length) {
                    currentParent().children.push(tagAst)
                } else {
                    root = tagAst // 第一个标签一定是root
                }
                if (!(end[1] || isUnaryTag(tagAst.tag))) {
                    stack.push(tagAst) // <br/> <img> 不能成为parent 
                }
            }
        }

        function advance(n) {
            index += n
            html = html.substring(n)
        }
        return root
    }

    /**
     * 将ast生成为render code
     */
    function generate(ast) {
        const code = genElement(ast)
        console.log(code)
        return `with(this){return ${code}}`
    }

    function genElement(node) {
        const children = genChildren(node)
        const data = genData(node)
        let code = `_c('${node.tag}'${data ? `,${data}` : ``}${children ? `,${children}` : ``})`
        return code
    }

    function genChildren(node) {
        const children = node.children
        if (children.length) {
            return `[${children.map(c => genNode(c)).join(',')}]`
        }
    }

    function genData(node) {
        let data = '{'
        // attributes
        if (node.attrsList) {
            data += `attrs:{${genProps(node.attrsList)}},`;
        }
        data = data.replace(/,$/, '') + '}';
        return data 
    }

    function genProps(props) {
        let res = ''
        for (let i = 0; i < props.length; i++) {
            const prop = props[i]
            res += `"${prop.name}":${prop.value},`
        }
        return res.slice(0, -1)
    }

    function genNode(node) {
        // console.log(node)
        if (node.type === 1) {
            return genElement(node)
        } else if (node.type === 3 && node.isComment) {
            return `_e(${JSON.stringify(node.text)})`
        } else if (node.type === 2) {
            return `_v(${JSON.stringify(node.text)})`
        } else {
            return `_v(${JSON.stringify(node.text)})`
        }
    }

    const canBeLeftOpenTag = makeMap(
        'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'
    );

    const isUnaryTag = makeMap(
        'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
        'link,meta,param,source,track,wbr'
    );
    const isNonPhrasingTag = makeMap(
        'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
        'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
        'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
        'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
        'title,tr,track'
    );

    /**
     * Make a map and return a function for checking if a key
     * is in that map.
     */
    function makeMap(str, expectsLowerCase) {
        var map = Object.create(null);
        var list = str.split(',');
        for (var i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase
            ? function (val) { return map[val.toLowerCase()]; }
            : function (val) { return map[val]; }
    }

    function warn(msg, range) {
        console.error(`[Vue compiler]: ${msg}`);
    }

    function makeAttrsMap(attrs) {
        const map = {};
        for (let i = 0, l = attrs.length; i < l; i++) {
            map[attrs[i].name] = attrs[i].value;
        }
        return map
    }

    return Vue
}))


// (function (global, factory) {
//     console.log("start");
//     global.Vue = factory()
// })(this, (function () { return 1 }))

