/*
 * Cora 网络入口/出口查询
 *
 * 本机公网信息由 Cora NE 的 DIRECT 出站在运行前采集；节点入口地址由
 * mihomo 当前实际选中的代理提供。脚本本身只经所选节点查询入口/出口归属。
 */

var params = ($environment && $environment.params) || {};
var nodeName = params.node || "当前节点";
var nodeInfo = params.nodeInfo || {};
var directNetworkInfo = params.directNetworkInfo || {};
var exitEndpoints = [
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
            var status = response && (response.status || response.statusCode);
            if (error || !response || status < 200 || status >= 300 || !body) {
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

function nonEmpty(values) {
    return values.filter(function (value) { return value && value !== "-"; });
}

function parseInfo(data) {
    if (!data || data.success === false) return null;
    var connection = data.connection || {};
    var country = firstValue([data.country, data.country_name, data.countryCode]);
    var region = firstValue([data.region, data.regionName]);
    var city = firstValue([data.city]);
    var location = nonEmpty([country, region, city]).join(" / ") || "-";
    var ip = firstValue([data.ip, data.query]);
    if (ip === "-") return null;
    return {
        ip: ip,
        location: location,
        asn: firstValue([data.asn, connection.asn]),
        organization: firstValue([data.asOrganization, data.organization, data.asn_organization, data.org, connection.org]),
        isp: firstValue([data.isp, connection.isp])
    };
}

function directValue(key) {
    var value = directNetworkInfo[key];
    return value === undefined || value === null || String(value).trim() === "" ? "-" : String(value);
}

function finish(exitInfo, entranceInfo, exitSourceCount) {
    var entranceAddress = firstValue([nodeInfo.address, nodeInfo.host]);
    var entranceIP = firstValue([nodeInfo.ip]);
    var lines = [
        "本机公网 IP：" + directValue("ip"),
        "本机归属地：" + directValue("location"),
        "本机 ASN：" + directValue("asn"),
        "本机网络组织：" + directValue("organization"),
        "入口节点：" + nodeName,
        "节点入口：" + entranceAddress,
        "入口 IP：" + entranceIP,
        "入口归属地：" + (entranceInfo ? entranceInfo.location : "-"),
        "入口 ASN：" + (entranceInfo ? entranceInfo.asn : "-"),
        "入口网络组织：" + (entranceInfo ? entranceInfo.organization : "-"),
        "出口 IP：" + (exitInfo ? exitInfo.ip : "查询失败"),
        "出口归属地：" + (exitInfo ? exitInfo.location : "-"),
        "出口 ASN：" + (exitInfo ? exitInfo.asn : "-"),
        "出口网络组织：" + (exitInfo ? exitInfo.organization : "-"),
        "出口运营商：" + (exitInfo ? exitInfo.isp : "-"),
        exitInfo ? "出口数据校验：" + exitSourceCount + " 个接口可用" : "出口状态：检测失败（接口无响应或返回格式异常）"
    ];
    $done({
        title: "网络入口/出口查询",
        htmlMessage: lines.join("<br>")
    });
}

var entranceIP = firstValue([nodeInfo.ip]);
var entranceRequest = entranceIP === "-"
    ? Promise.resolve(null)
    : request("https://ipwho.is/" + encodeURIComponent(entranceIP));

Promise.all([
    Promise.all(exitEndpoints.map(request)),
    entranceRequest
]).then(function (responses) {
    var exits = responses[0].map(parseInfo).filter(function (value) { return value !== null; });
    finish(exits[0] || null, parseInfo(responses[1]), exits.length);
}).catch(function (_) {
    finish(null, null, 0);
});
