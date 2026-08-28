/*
 * Cora 网络入口/出口查询
 *
 * 参考 Loon NetworkEntryAndExitQueries.js 的展示目标，改为 Cora 的
 * node-http 运行时契约。Cora 只能安全地通过所选节点发起 HTTPS 请求，
 * 因此“入口”显示为本次使用的节点标识，“出口”使用 IP 地理接口确认。
 */

var nodeName = ($environment && $environment.params && $environment.params.node) || "当前节点";
var endpoints = [
    "https://ipwho.is/",
    "https://api.ip.sb/geoip"
];

function request(url) {
    return new Promise(function (resolve) {
        $httpClient.get({
            url: url,
            node: nodeName,
            timeout: 12000,
            headers: {
                "User-Agent": "Cora/1.0 NetworkCheck",
                "Accept": "application/json"
            }
        }, function (error, response, body) {
            if (error || !response) {
                resolve(null);
                return;
            }
            var status = response.status || response.statusCode;
            if (status < 200 || status >= 300 || !body) {
                resolve(null);
                return;
            }
            try {
                resolve(JSON.parse(body));
            } catch (_) {
                resolve(null);
            }
        });
    });
}

function firstValue(values) {
    for (var i = 0; i < values.length; i += 1) {
        if (values[i] !== undefined && values[i] !== null && String(values[i]).trim() !== "") {
            return String(values[i]);
        }
    }
    return "-";
}

function parseInfo(data) {
    if (!data || data.success === false) return null;
    var connection = data.connection || {};
    var country = firstValue([data.country, data.country_name]);
    var region = firstValue([data.region, data.regionName]);
    var city = firstValue([data.city]);
    var location = [country, region, city].filter(function (value) { return value !== "-"; }).join(" / ") || "-";
    var ip = firstValue([data.ip, data.query]);
    if (ip === "-") return null;
    return {
        ip: ip,
        location: location,
        asn: firstValue([data.asn, connection.asn]),
        organization: firstValue([data.asOrganization, data.organization, data.org, connection.org]),
        isp: firstValue([data.isp, connection.isp])
    };
}

function finish(info, sourceCount) {
    var lines = [
        "入口节点：" + nodeName,
        "出口 IP：" + (info ? info.ip : "查询失败"),
        "出口位置：" + (info ? info.location : "-"),
        "ASN：" + (info ? info.asn : "-"),
        "网络组织：" + (info ? info.organization : "-"),
        "运营商：" + (info ? info.isp : "-"),
        info ? "数据校验：已从 " + sourceCount + " 个接口取得结果" : "状态：检测失败（接口无响应或返回格式异常）"
    ];
    $done({
        title: "网络入口/出口查询",
        htmlMessage: lines.join("<br>")
    });
}

Promise.all(endpoints.map(request)).then(function (responses) {
    var parsed = responses.map(parseInfo).filter(function (value) { return value !== null; });
    finish(parsed[0] || null, parsed.length);
}).catch(function (_) {
    finish(null, 0);
});
