(function (global, factory) {
    global.Vue = factory()
}(this, (function () {
    'use strict'

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
        console.log(html.trim())
    }

    function parseHTML(html, options) {
        const stack = 0
        let index = 0
        let lastTag

        while (html) {
            let textEnd = html.indexOf('<')
            // 文本结束 标签开始
            if (textEnd === 0) {
                // 注释
                if (comment.test(html)) {
                    const commentEnd = html.indexOf('-->')
                    if (commentEnd >= 0) {
                        options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3);
                        advance(commentEnd + 3)
                        continue
                    }
                }


                // 结束标签 
                const endTagMatch = html.match(endTag)
                if (endTagMatch) {
                    const curIndex = index
                    advance(endTagMatch[0].length)
                    parseEndTag(endTagMatch[1], curIndex, index)
                    continue
                }

                // 开始标签
                const startTagMatch = parseStartTag()
                if (startTagMatch) {
                    handleStartTag(startTagMatch)
                }

            }
        }

        function advance(n) {
            index += n
            html = html.substring(n)
        }

        /**
         * 解析开始标签
         */
        function parseStartTag() {
            // 开始标签open <div
            const start = html.match(startTagOpen)
            if (start)
                const match = {
                    tagName: start[1],
                    attrs: [],
                    start: index
                }
            advance(start[0].length)
            // 解析标签属性直到标签闭合
            let end, attr;
            while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
                const attrMatch = {
                    name: attr[1],
                    value: attr[3] || attr[4] || attr[5] || '',
                    start: index
                }
                advance(attr[0].length);
                attrMatch.end = index
                match.attrs.push(attrMatch);
            }
            if (end) {
                match.unarySlash = end[1]; // <div/>
                advance(end[0].length)
                match.end = index
                return match
            }
        }

        function handleStartTag(match) {
            const tagName = match.tagName
            const unarySlash = match.unarySlash

            if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
                parseEndTag(lastTag);
            }
            if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
                parseEndTag(tagName);
            }
            // 是否自闭合
            const unary = isUnaryTag(tagName) || !!unarySlash;
            if (!unary) {
                stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end });
                lastTag = tagName;
            }
            options.start(tagName, attrs, unary, match.start, match.end);
        }

        function parseEndTag(tagName, start, end) {
            let pos, lowerCasedTagName
            if (start == null) start = index
            if (end == null) end = index
            // 对应的打开标签
            if (tagName) {
                lowerCasedTagName = tagName.toLowerCase()
                // 找不到时 pos=-1
                for (pos = stack.length - 1; pos >= 0; pos--) {
                    if (stack[pos].lowerCasedTag === lowerCasedTagName) {
                        break
                    }
                }
            } else {
                // 关闭所有stack内的标签
                pos = 0
            }
            if (pos >= 0) {
                for (let i = stack.length - 1; i >= pos; i--) {
                    if (i > pos || !tagName) {
                        warn(`tag <${stack[i].tag}> has no matching end tag.`)
                    }
                    options.end(stack[i].tag, start, end);
                }
                // 关闭区间内的所有标签
                stack.length = pos;
                lastTag = pos && stack[pos - 1].tag;
            } else if (lowerCasedTagName === 'br') {
                options.start(tagName, [], true, start, end);
            } else if (lowerCasedTagName === 'p') {
                options.start(tagName, [], false, start, end);
                options.end(tagName, start, end);
            }
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

    return Vue
})))

