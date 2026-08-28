/*
 * Cora IP 质量检测
 *
 * 参考 Loon IPQualityDetection.js。只输出用户可读的核心字段，避免把
 * API 的扩展原始字段和大对象带入 NE，所有不确定值均显示为“未知”。
 */

var nodeName = ($environment && $environment.params && $environment.params.node) || "当前节点";
var apiURL = "https://my.ippure.com/v1/info";

function valueOf(value) {
    return value === undefined || value === null || String(value).trim() === "" ? "-" : String(value);
}

function boolText(value) {
    if (value === true) return "是";
    if (value === false) return "否";
    return "未知";
}

function riskText(value) {
    var score = Number(value);
    if (isNaN(score)) return "未知";
    if (score >= 80) return "高风险";
    if (score >= 50) return "中风险";
    if (score >= 20) return "低风险";
    return "很低";
}

$httpClient.get({
    url: apiURL,
    node: nodeName,
    timeout: 12000,
    headers: {
        "User-Agent": "Cora/1.0 IPQuality",
        "Accept": "application/json"
    }
}, function (error, response, body) {
    var status = response && (response.status || response.statusCode);
    if (error || !response) {
        doneFailure("请求超时或节点无响应");
        return;
    }
    if (status === 403 || status === 429) {
        doneFailure("接口暂时限制请求（检测受限）");
        return;
    }
    if (status !== 200 || !body) {
        doneFailure("接口返回异常（HTTP " + valueOf(status) + "）");
        return;
    }
    try {
        var data = JSON.parse(body);
        var country = valueOf(data.country);
        var region = valueOf(data.region);
        var city = valueOf(data.city);
        var location = [country, region, city].filter(function (item) { return item !== "-"; }).join(" / ") || "-";
        var lines = [
            "出口 IP：" + valueOf(data.ip),
            "IP 地区：" + location,
            "时区：" + valueOf(data.timezone),
            "ASN：" + valueOf(data.asn),
            "ASN 机构：" + valueOf(data.asOrganization || data.organization || data.org),
            "IP 类型：" + (data.isBroadcast === true ? "广播 IP" : data.isBroadcast === false ? "原生 IP" : "未知"),
            "网络属性：" + (data.isResidential === true ? "住宅 IP" : data.isResidential === false ? "机房 IP" : "未知"),
            "住宅属性：" + boolText(data.isResidential),
            "广播属性：" + boolText(data.isBroadcast),
            "风险系数：" + valueOf(data.fraudScore),
            "风险评级：" + riskText(data.fraudScore),
            "节点：" + nodeName
        ];
        $done({ title: "IP 质量检测", htmlMessage: lines.join("<br>") });
    } catch (_) {
        doneFailure("响应格式无法解析");
    }
});

function doneFailure(message) {
    $done({
        title: "IP 质量检测",
        htmlMessage: ["节点：" + nodeName, "状态：" + message].join("<br>")
    });
}
