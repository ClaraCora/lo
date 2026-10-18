/*
 * IP 质量检测（Cora / Loon）
 * IPPure：出口 IP、ASN、住宅/机房、广播及风险信息。
 * Google：K4WWud 返回的 IP 定位；Gemini：匿名网页可用性标记。
 * 三项并行，经所选节点请求，互不影响；不确定时不推测解锁状态。
 */

var nodeName = (typeof $environment !== "undefined" && $environment.params && $environment.params.node) || "当前节点";
var apiURL = "https://my.ippure.com/v1/info";
var googleLocationURL = "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=K4WWud&hl=en";
var geminiURL = "https://gemini.google.com/?hl=en";
var browserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
// 固定英文请求下的国家/地区名称，用于拒绝把只有城市的结果误判为“未送中”。
var googleCountryNames = (
    "Afghanistan|Albania|Algeria|American Samoa|Andorra|Angola|Anguilla|Antarctica|Antigua & Barbuda|" +
    "Argentina|Armenia|Aruba|Australia|Austria|Azerbaijan|Bahamas|Bahrain|Bangladesh|Barbados|Belarus|" +
    "Belgium|Belize|Benin|Bermuda|Bhutan|Bolivia|Bosnia & Herzegovina|Botswana|Bouvet Island|Brazil|" +
    "British Indian Ocean Territory|British Virgin Islands|Brunei|Bulgaria|Burkina Faso|Burundi|Cambodia|" +
    "Cameroon|Canada|Cape Verde|Caribbean Netherlands|Cayman Islands|Central African Republic|Chad|Chile|" +
    "China|Christmas Island|Cocos (Keeling) Islands|Colombia|Comoros|Congo - Brazzaville|Congo - Kinshasa|" +
    "Cook Islands|Costa Rica|Croatia|Cuba|Curaçao|Cyprus|Czech Republic|Czechia|Côte d’Ivoire|Denmark|" +
    "Djibouti|Dominica|Dominican Republic|East Timor|Ecuador|Egypt|El Salvador|Equatorial Guinea|Eritrea|" +
    "Estonia|Eswatini|Ethiopia|Falkland Islands|Faroe Islands|Fiji|Finland|France|French Guiana|" +
    "French Polynesia|French Southern Territories|Gabon|Gambia|Georgia|Germany|Ghana|Gibraltar|Greece|" +
    "Greenland|Grenada|Guadeloupe|Guam|Guatemala|Guernsey|Guinea|Guinea-Bissau|Guyana|Haiti|" +
    "Heard & McDonald Islands|Honduras|Hong Kong|Hong Kong SAR China|Hungary|Iceland|India|Indonesia|Iran|Iraq|" +
    "Ireland|Isle of Man|Israel|Italy|Ivory Coast|Jamaica|Japan|Jersey|Jordan|Kazakhstan|Kenya|Kiribati|" +
    "Kosovo|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|Lesotho|Liberia|Libya|Liechtenstein|Lithuania|" +
    "Luxembourg|Macao|Macao SAR China|Macau|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Marshall Islands|" +
    "Martinique|Mauritania|Mauritius|Mayotte|Mexico|Micronesia|Moldova|Monaco|Mongolia|Montenegro|" +
    "Montserrat|Morocco|Mozambique|Myanmar (Burma)|Namibia|Nauru|Nepal|Netherlands|New Caledonia|" +
    "New Zealand|Nicaragua|Niger|Nigeria|Niue|Norfolk Island|North Korea|North Macedonia|" +
    "Northern Mariana Islands|Norway|Oman|Pakistan|Palau|Palestinian Territories|Panama|Papua New Guinea|" +
    "Paraguay|Peru|Philippines|Pitcairn Islands|Poland|Portugal|Puerto Rico|Qatar|Romania|Russia|Rwanda|" +
    "Réunion|Samoa|San Marino|Saudi Arabia|Senegal|Serbia|Seychelles|Sierra Leone|Singapore|Sint Maarten|" +
    "Slovakia|Slovenia|Solomon Islands|Somalia|South Africa|South Georgia & South Sandwich Islands|" +
    "South Korea|South Sudan|Spain|Sri Lanka|St. Barthélemy|St. Helena|St. Kitts & Nevis|St. Lucia|" +
    "St. Martin|St. Pierre & Miquelon|St. Vincent & Grenadines|Sudan|Suriname|Svalbard & Jan Mayen|" +
    "Swaziland|Sweden|Switzerland|Syria|São Tomé & Príncipe|Taiwan|Tajikistan|Tanzania|Thailand|" +
    "The Bahamas|The Gambia|Timor-Leste|Togo|Tokelau|Tonga|Trinidad & Tobago|Tunisia|Turkey|Turkmenistan|" +
    "Turks & Caicos Islands|Tuvalu|Türkiye|U.S. Outlying Islands|U.S. Virgin Islands|Uganda|Ukraine|" +
    "United Arab Emirates|United Kingdom|United States|Uruguay|Uzbekistan|Vanuatu|Vatican City|Venezuela|" +
    "Vietnam|Wallis & Futuna|Western Sahara|Yemen|Zambia|Zimbabwe|Åland Islands"
).split("|");

function valueOf(value) {
    if (value === undefined || value === null || typeof value === "object" || typeof value === "function") return "-";
    return String(value).trim() || "-";
}

function escapeHTML(value) {
    return valueOf(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function line(label, value) {
    return escapeHTML(label) + "：" + escapeHTML(value);
}

function boolText(value) {
    if (value === true) return "是";
    if (value === false) return "否";
    return "未知";
}

function riskScore(value) {
    if ((typeof value !== "number" && typeof value !== "string") || valueOf(value) === "-") return null;
    var score = Number(value);
    return isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

function riskText(value) {
    var score = riskScore(value);
    if (score === null) return "未知";
    if (score >= 80) return "高风险";
    if (score >= 50) return "中风险";
    if (score >= 20) return "低风险";
    return "很低";
}

function request(method, url, body) {
    return new Promise(function (resolve) {
        var options = {
            url: url,
            node: nodeName,
            timeout: 10000,
            "auto-redirect": true,
            headers: {
                "User-Agent": browserAgent,
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": url === apiURL ? "application/json" : "*/*"
            }
        };
        if (body !== undefined) {
            options.body = body;
            options.headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
        }
        try {
            $httpClient[method](options, function (error, response, data) {
                resolve({
                    error: !!error || !response,
                    status: Number(response && (response.status || response.statusCode)) || 0,
                    body: typeof data === "string" ? data : ""
                });
            });
        } catch (_) {
            resolve({ error: true, status: 0, body: "" });
        }
    });
}

function requestProblem(result) {
    if (result.error) return "请求超时或节点无响应";
    if (result.status === 403 || result.status === 429) return "检测受限（HTTP " + result.status + "，无法判断）";
    if (result.status !== 200) return "接口异常（HTTP " + result.status + "）";
    if (!result.body.trim()) return "响应为空（无法判断）";
    return "";
}

function qualityLines(result) {
    var problem = requestProblem(result);
    if (problem) return [line("IP 质量", problem)];
    var data;
    try {
        data = JSON.parse(result.body);
    } catch (_) {
        return [line("IP 质量", "响应格式无法解析")];
    }
    if (!data || typeof data !== "object" || Array.isArray(data) || valueOf(data.ip) === "-") {
        return [line("IP 质量", "接口未返回有效 IP 信息")];
    }
    var location = [data.country, data.region, data.city].map(valueOf)
        .filter(function (item) { return item !== "-"; }).join(" / ") || "-";
    var score = riskScore(data.fraudScore);
    return [
        line("出口 IP", data.ip),
        line("IP 地区", location),
        line("时区", data.timezone),
        line("ASN", data.asn),
        line("ASN 机构", data.asOrganization || data.organization || data.org),
        line("IP 类型", data.isBroadcast === true ? "广播 IP" : data.isBroadcast === false ? "原生 IP" : "未知"),
        line("网络属性", data.isResidential === true ? "住宅 IP" : data.isResidential === false ? "机房 IP" : "未知"),
        line("住宅属性", boolText(data.isResidential)),
        line("广播属性", boolText(data.isBroadcast)),
        line("风险系数", score === null ? "未知" : score),
        line("风险评级", riskText(data.fraudScore))
    ];
}

function googleLocation(result) {
    var problem = requestProblem(result);
    if (problem) return { location: "", problem: problem };
    // batchexecute 带 XSSI 前缀，也可能在 JSON 行前插入长度；不使用 eval。
    var frames = result.body.split("\n");
    for (var i = 0; i < frames.length; i += 1) {
        if (frames[i].trim().charAt(0) !== "[") continue;
        try {
            var rows = JSON.parse(frames[i]);
            if (!Array.isArray(rows)) continue;
            for (var j = 0; j < rows.length; j += 1) {
                var row = rows[j];
                if (!Array.isArray(row) || row[0] !== "wrb.fr" || row[1] !== "K4WWud" || typeof row[2] !== "string") continue;
                var details = JSON.parse(row[2]);
                var place = Array.isArray(details) && details[0];
                if (!Array.isArray(place) || typeof place[0] !== "string" || place[1] !== "SWML_DESCRIPTION_FROM_YOUR_INTERNET_ADDRESS") continue;
                var location = place[0].trim();
                if (location && location.length <= 160) return { location: location, problem: "" };
            }
        } catch (_) {
            // 只接受可解析且明确来自出口 IP 的定位帧。
        }
    }
    return { location: "", problem: "无法判断（未取得 Google IP 定位）" };
}

function googleCNText(info) {
    if (!info.location) return "无法判断";
    var country = info.location.split(",").pop().trim();
    if (/^(?:China|Mainland China|China mainland|People's Republic of China)$/i.test(country)) {
        // Google 有时把港澳台的地址后缀也写为 China，不能据此判作中国大陆。
        return /\b(?:Hong Kong|Macao|Macau|Taiwan)\b/i.test(info.location) ? "未送中（港澳台地区）" : "已送中（中国大陆）";
    }
    return googleCountryNames.indexOf(country) !== -1 ? "未送中" : "无法判断（定位未包含可识别的国家/地区）";
}

function geminiText(result) {
    var problem = requestProblem(result);
    if (problem) return problem;
    var source = result.body.replace(/\\u0022/gi, '"').replace(/\\+"/g, '"');
    var visibleText = source.replace(/<script\b[^>]*>[\s\S]*?(?:<\/script>|$)/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?(?:<\/style>|$)/gi, " ").replace(/<[^>]*>/g, " ")
        .replace(/&#(?:0*39|x0*27);|&apos;|&rsquo;|[’‘]/gi, "'").replace(/\s+/g, " ");
    if (/unusual traffic from|automated queries|verify (?:that )?you(?:'re| are) (?:a )?human/i.test(visibleText)) {
        return "检测受限（触发人机验证，无法判断）";
    }
    if (/(?:not|isn't)(?: currently| yet)? (?:available|supported) in (?:your|this) (?:country|region)|unavailable in your region/i.test(visibleText)) {
        return "未解锁（所在地区暂不支持）";
    }
    // 兼容旧数组格式和新版转义 JSON；不能仅凭 HTTP 200 或国家白名单判作解锁。
    var available = source.match(/(?:\[\s*45631641\s*,\s*null\s*,\s*|"45631641"\s*:\s*)(true|false)\b/);
    if (available) return available[1] === "true" ? "已解锁（匿名网页检测）" : "未解锁（网页可用性受限）";
    return "无法判断（页面可访问，未发现解锁标记）";
}

var locationBody = "f.req=" + encodeURIComponent(JSON.stringify([
    [["K4WWud", "[[0],[\"en-US\"]]", null, "generic"]]
]));

Promise.all([
    request("get", apiURL),
    request("post", googleLocationURL, locationBody),
    request("get", geminiURL)
]).then(function (results) {
    var info = googleLocation(results[1]);
    var lines = qualityLines(results[0]).concat([
        "",
        "Google 检测",
        line("Google 地区", info.location || info.problem),
        line("Google 送中", googleCNText(info)),
        line("Gemini 解锁", geminiText(results[2])),
        "说明：定位来自 Google 对出口 IP 的识别；Gemini 为未登录检测，实际使用还受账号、年龄等条件影响。",
        line("节点", nodeName)
    ]);
    $done({ title: "IP 质量检测", htmlMessage: lines.join("<br>") });
});
