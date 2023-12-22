import { monaco } from "react-monaco-editor";
import { editor, languages, Position } from "monaco-editor";
import { CancellationToken } from "typescript";
import "./spaceengine";
import i18next from "../../i18n"

// https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
monaco.languages.register({ id: "http" })
// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('http', {
    triggerCharacters: ["{"],
    // @ts-ignore
    provideCompletionItems: (model, position) => {
        let suggestions = [
            {
                kind: languages.CompletionItemKind.Snippet,
                label: i18next.t("Authorization: Basic ... 快速添加基础认证"),
                insertText: "Authorization: Basic {{base64(${1:username}:${2:password})}}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Authorization",
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: i18next.t("Authorization: Bearer ... 快速添加 JWT"),
                insertText: "Authorization: Bearer ${1:...}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Authorization",
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: "User-Agent",
                insertText: "User-Agent: ${1:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "User-Agent",
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: "X-Forwarded-For",
                insertText: "X-Forwarded-For: ${1:127.0.0.1}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: i18next.t("XFF 快捷设置"),
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: i18next.t("Range 设置 Bytes 构造 206 响应"),
                insertText: "Range: bytes=0-${1:1023}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: i18next.t("构造206响应：Range 设置 Bytes"),
            } as languages.CompletionItem,
            ...[
                "Accept",
                "Accept-Charset",
                "Accept-Encoding",
                "Accept-Language",
                "Accept-Ranges",
                "Cache-Control",
                "Cc",
                "Connection",
                "Content-Id",
                "Content-Language",
                "Content-Length",
                "Content-Transfer-Encoding",
                "Content-Type",
                "Cookie",
                "Date",
                "Dkim-Signature",
                "Etag",
                "Expires",
                "From",
                "Host",
                "If-Modified-Since",
                "If-None-Match",
                "In-Reply-To",
                "Last-Modified",
                "Location",
                "Message-Id",
                "Mime-Version",
                "Pragma",
                "Received",
                "Return-Path",
                "Server",
                "Set-Cookie",
                "Subject",
                "To",
                // 自有安排
                // "User-Agent",
                // "X-Forwarded-For",
                "Via",
                "X-Imforwards",
                "X-Powered-By",
            ].map(i => {
                return {
                    kind: languages.CompletionItemKind.Snippet,
                    label: i,
                    insertText: i + ": ${1}",
                    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: "Common HTTP Header"
                } as languages.CompletionItem
            }),
        ];
        const line = model.getLineContent(position.lineNumber);
        if (position.column > 2) {
            const lastTwo = line.charAt(position.column - 3) + line.charAt(position.column - 2)
            if (lastTwo === "{{") {
                return {
                    suggestions: [
                        {
                            label: i18next.t("date() 生成一个日期"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'date(YYYY-MM-dd)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("datetime() 生成一个日期(带时间)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'datetime(YYYY-MM-dd HH:mm:ss)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("timestamp(s/ms/ns) 生成一个时间戳（秒/毫秒/纳秒）"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'timestamp(seconds)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("uuid(n) 生成 n 个 UUID"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'uuid(3)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("int(整数范围)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'int(${1:0}${2:,100})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("int(整数范围-0补位)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'int(${1:0}${2:-100}${3:|3})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("network(拆分网络目标段)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'network(${1:192.168.1.1/24,example.com})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("array(使用'|'分割数组元素渲染)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'array(${1:abc|def|123})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("x(使用 payload 管理中的数据)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'array(${1:abc|def|123})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("randint(随机生成整数)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'randint(${1:1}${2:,10}${3:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("randstr(随机生成字符串)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'randstr(${1:1}${2:,10}${3:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("file:line(按行读取文件内容)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file:line(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("file(直接插入文件内容)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("file:dir(插入文件目录下所有文件-模糊上传)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file:dir(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("base64(使用内容 base64 编码)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'base64(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("url(使用 URL 编码)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'url(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("doubleurl(使用双重 URL 编码)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'url(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("hexdec(使用十六进制解码)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'hexdec(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("repeat(重复一定次数发包)"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat(${1:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("repeat:str(data|n) 重复 data n 次，a|3 为 aaa"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat:str(${1:abc}|10)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("repeat:range(data|n) a|3 为 ['' a aa aaa] 多次重复"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat:range(${1:abc}|10)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        // yso 生成提示
                        {
                            label: "yso:urldns(domain)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:urldns(domain)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("yso:dnslog(domain|随机标识) // 第二个参数可不填"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:dnslog(domain|flag)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:find_gadget_by_dns(domain) // 通过 dnslog 探测 gadget ",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:find_gadget_by_dns(domain)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:find_gadget_by_bomb(all) // all 为内置,也可以自己指定class类 ",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:find_gadget_by_bomb(all)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("yso:headerecho(key|value) // 指定回显成功的返回头 key:value"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:headerecho(testecho|echo_flag)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("yso:bodyexec(whoami) // 执行命令"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:bodyexec(whoami)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("headerauth // 回显链中需要添加此header头"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'headerauth}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("trim(...) 移除前后空格"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'trim(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("nullbyte(n) 生成长度为N的nullbyte，默认为1"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'nullbyte(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("padding:zero(data|n) 为 data 长度不足的部分用 0 填充"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'padding:zero(${1}|${2:6})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("padding:null(data|n) 为 data 长度不足的部分用 null(ascii 0x00) 填充"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'padding:null(${1}|${2:6})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("fuzz:pass(...|levelN) 根据材料生成密码（levelN 表示生成密码详细数量0-3级）"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'fuzz:pass(${1:root,admin}|${2:0})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("fuzz:user(...|levelN) 根据材料生成用户名（levelN 表示生成数量，0-3级）"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'fuzz:pass(${1:root,admin}|${2:0})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("gzip:encode(...) gzip 编码"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'gzip(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: i18next.t("gzip:decode(...) gzip 解码"),
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'gzip:decode(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                    ]
                }
            }
        }
        return { suggestions: suggestions, };
    }
} as any);


monaco.languages.setMonarchTokensProvider("http", {
    brackets: [],
    defaultToken: "",
    ignoreCase: true,
    includeLF: true,
    start: "",
    tokenPostfix: "",
    unicode: false,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
        root: [
            // HTTP请求方法
            // 基础 Fuzz 标签解析
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(GET|POST|OPTIONS|DELETE|PUT)/g, "http.method"],
            [/\s/, "delimiter", "@http_path"],
            // [/(html|div|src|\<\/?title\>|<alert>)/i, "keyword"],
            // [/(\<script\>|<alert>|<prompt>|<svg )/i, "keyword"],
            // [/(secret)|(access)|(password)|(verify)|(login)/i, "bold-keyword"],
        ],
        fuzz_tag: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag_second"],
            [/}}/, "fuzz.tag.inner", "@pop"],
            [/[\w:]+}}/, "fuzz.tag.inner", "@pop"],
            [/[\w:]+\(/, "fuzz.tag.inner", "@fuzz_tag_param"],
        ],
        fuzz_tag_second: [
            [/{{/, "fuzz.tag.second", "@fuzz_tag"],
            [/}}/, "fuzz.tag.second", "@pop"],
            [/[\w:]+}}/, "fuzz.tag.second", "@pop"],
            [/[\w:]+\(/, "fuzz.tag.second", "@fuzz_tag_param_second"],
        ],
        fuzz_tag_param: [
            [/\(/, "fuzz.tag.inner", "@fuzz_tag_param"],
            [/\\\)/, "bold-keyword"],
            [/\)/, "fuzz.tag.inner", "@pop"],
            [/{{/, "fuzz.tag.second", "@fuzz_tag_second"],
            [/./, "bold-keyword"]
        ],
        fuzz_tag_param_second: [
            [/\\\)/, "bold-keyword"],
            [/\)/, "fuzz.tag.second", "@pop"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/./, "bold-keyword"]
        ],
        http_path: [
            [/\s/, "delimiter", "@http_protocol"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            ["/(((http)|(https):)?\/\/[^\s]+?)/", "http.url"],
            // [/\/[^\s^?^\/]+/, "http.path"],
            [/\?/, "http.query", "@query"],
        ],
        http_protocol: [
            [/\n/, "delimiter", "@http_header"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/HTTP\/[0-9.]+/, "http.protocol"],
        ],
        http_header: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/^\n$/, 'body.delimiter', '@body'],
            [/(Cookie)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_cookie" }]],
            [/(Content-Type)(:)/g, ["http.header.danger", { token: "delimiter", next: "@content_type" }]],
            [/(Content-Length|Host|Origin|Referer)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_header_value" }]],
            [/(Authorization|X-Forward|Real|User-Agent|Protection|CSP)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_header_value" }]],
            [/Sec/, "http.header.warning", "@sec_http_header"],
            [/:/, "delimiter", "@http_header_value"],
            [/\S/, "http.header.info"],
        ],
        sec_http_header: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/:/, "delimiter", "@http_header_value"],
            [/\S/, "http.header.warning"],
        ],
        content_type: [
            [/\s+$/, "delimiter", "@pop"],
            [/\s+/, "delimiter"],
            [/multipart\/form-data.*/, "http.header.mime.form", "@pop"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/application\/xml/, "http.header.mime.xml", "@pop"],
            [/application\/json/, "http.header.mime.json", "@pop"],
            [/application\/x-www-form-urlencoded/, "http.header.mime.urlencoded", "@pop"],
            [/\S/, "http.header.mime.default", "@pop"],
        ],
        query: [
            [/\s/, "delimiter", "@http_protocol"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^=&?\[\]\s]+/, "http.query.params", "@http_query_params"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_query_params: [
            [/\s/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/&/, 'delimiter', "@pop"],
            [/(\[)(\w+)(\])/, ["http.query.index", "http.query.index.values", "http.query.index"]],
            [/\=/, "http.query.equal", "http_query_params_values"],
        ],
        http_query_params_values: [
            [/\s/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/&/, { token: 'delimiter', next: "@pop", goBack: 1 }],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^=&?\s]+/, "http.query.values"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_cookie: [
            [/\n/, "delimiter", "@pop"],
            [/\s/, "delimiter"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^=;\s]+/, "http.query.params", "@http_cookie_params"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_cookie_params: [
            [/\n/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/[\s|;]/, "delimiter", "@pop"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/\=/, "http.query.equal"],
            [/[^=;?\s]/, "http.query.values"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_header_value: [
            [/\n/, "delimiter", "@pop"],
            [/\s/, "delimiter"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
        ],
        string_double: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^\\"]/, "string.value"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "string", "@body_json"],
        ],
        body: [
            [/(\d+)(:)/, [{ token: "number", next: "@body_json" }, "delimiter"]],
            [/(\d+\.\d*)(:)/, [{ token: "number", next: "@body_json" }, "delimiter"]],
            [/"/, 'string', '@string_double'],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/-{2,}.*/, "body.boundary", "@body_form"],
            [/\w+/, "http.query.params", "@http_query_params"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        body_json: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(:\s*)/, "delimiter"],
            [/(\d+)/, "number"],
            [/(\d+\.\d*)/, "number"],
            [/"/, 'string', '@string_double'],
        ],
        body_form: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/^\n$/, "body.delimiter", "@body_data"],
            [/([^:]*?)(:)/g, ["http.header.info", { token: "delimiter", next: "@http_header_value" }]],
        ],
        body_data: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(-{2,}[a-zA-z0-9]+--)/, [{ token: "body.boundary.end", next: "@end" }]],
            [/(-{2,}[a-zA-z0-9]+)/, [{ token: "body.boundary", next: "@pop" }]],
        ],
        end: [],
    }
})

