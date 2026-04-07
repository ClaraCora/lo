/*
 * IP 纯净度查询
 * 脚本功能：检查节点出口 IP 的地理位置、ASN、原生/广播特征、住宅/机房属性、风险系数等
 * 数据来源：https://my.ippure.com/v1/info
 * 适用：Loon 节点页长按节点后，通过 generic 菜单触发
 */

const API_URL = "https://my.ippure.com/v1/info";

var inputParams = $environment.params;
var nodeName = inputParams.node;

let flags = new Map([[ "AC" , "🇦🇨" ],["AE","🇦🇪"], [ "AF" , "🇦🇫" ] , [ "AI" , "🇦🇮" ] , [ "AL" , "🇦🇱" ] , [ "AM" , "🇦🇲" ] , [ "AQ" , "🇦🇶" ] , [ "AR" , "🇦🇷" ] , [ "AS" , "🇦🇸" ] , [ "AT" , "🇦🇹" ] , [ "AU" , "🇦🇺" ] , [ "AW" , "🇦🇼" ] , [ "AX" , "🇦🇽" ] , [ "AZ" , "🇦🇿" ] ,["BA", "🇧🇦"], [ "BB" , "🇧🇧" ] , [ "BD" , "🇧🇩" ] , [ "BE" , "🇧🇪" ] , [ "BF" , "🇧🇫" ] , [ "BG" , "🇧🇬" ] , [ "BH" , "🇧🇭" ] , [ "BI" , "🇧🇮" ] , [ "BJ" , "🇧🇯" ] , [ "BM" , "🇧🇲" ] , [ "BN" , "🇧🇳" ] , [ "BO" , "🇧🇴" ] , [ "BR" , "🇧🇷" ] , [ "BS" , "🇧🇸" ] , [ "BT" , "🇧🇹" ] , [ "BV" , "🇧🇻" ] , [ "BW" , "🇧🇼" ] , [ "BY" , "🇧🇾" ] , [ "BZ" , "🇧🇿" ] , [ "CA" , "🇨🇦" ] , [ "CF" , "🇨🇫" ] , [ "CH" , "🇨🇭" ] , [ "CK" , "🇨🇰" ] , [ "CL" , "🇨🇱" ] , [ "CM" , "🇨🇲" ] , [ "CN" , "🇨🇳" ] , [ "CO" , "🇨🇴" ] , [ "CP" , "🇨🇵" ] , [ "CR" , "🇨🇷" ] , [ "CU" , "🇨🇺" ] , [ "CV" , "🇨🇻" ] , [ "CW" , "🇨🇼" ] , [ "CX" , "🇨🇽" ] , [ "CY" , "🇨🇾" ] , [ "CZ" , "🇨🇿" ] , [ "DE" , "🇩🇪" ] , [ "DG" , "🇩🇬" ] , [ "DJ" , "🇩🇯" ] , [ "DK" , "🇩🇰" ] , [ "DM" , "🇩🇲" ] , [ "DO" , "🇩🇴" ] , [ "DZ" , "🇩🇿" ] , [ "EA" , "🇪🇦" ] , [ "EC" , "🇪🇨" ] , [ "EE" , "🇪🇪" ] , [ "EG" , "🇪🇬" ] , [ "EH" , "🇪🇭" ] , [ "ER" , "🇪🇷" ] , [ "ES" , "🇪🇸" ] , [ "ET" , "🇪🇹" ] , [ "EU" , "🇪🇺" ] , [ "FI" , "🇫🇮" ] , [ "FJ" , "🇫🇯" ] , [ "FK" , "🇫🇰" ] , [ "FM" , "🇫🇲" ] , [ "FO" , "🇫🇴" ] , [ "FR" , "🇫🇷" ] , [ "GA" , "🇬🇦" ] , [ "GB" , "🇬🇧" ] , [ "HK" , "🇭🇰" ] ,["HU","🇭🇺"], [ "ID" , "🇮🇩" ] , [ "IE" , "🇮🇪" ] , [ "IL" , "🇮🇱" ] , [ "IM" , "🇮🇲" ] , [ "IN" , "🇮🇳" ] , [ "IS" , "🇮🇸" ] , [ "IT" , "🇮🇹" ] , [ "JP" , "🇯🇵" ] , [ "KR" , "🇰🇷" ] , [ "LU" , "🇱🇺" ] , [ "MO" , "🇲🇴" ] , [ "MX" , "🇲🇽" ] , [ "MY" , "🇲🇾" ] , [ "NL" , "🇳🇱" ] , [ "PH" , "🇵🇭" ] , [ "RO" , "🇷🇴" ] , [ "RS" , "🇷🇸" ] , [ "RU" , "🇷🇺" ] , [ "RW" , "🇷🇼" ] , [ "SA" , "🇸🇦" ] , [ "SB" , "🇸🇧" ] , [ "SC" , "🇸🇨" ] , [ "SD" , "🇸🇩" ] , [ "SE" , "🇸🇪" ] , [ "SG" , "🇸🇬" ] , [ "TH" , "🇹🇭" ] , [ "TN" , "🇹🇳" ] , [ "TO" , "🇹🇴" ] , [ "TR" , "🇹🇷" ] , [ "TV" , "🇹🇻" ] , [ "TW" , "🇨🇳" ] , [ "UK" , "🇬🇧" ] , [ "UM" , "🇺🇲" ] , [ "US" , "🇺🇸" ] , [ "UY" , "🇺🇾" ] , [ "UZ" , "🇺🇿" ] , [ "VA" , "🇻🇦" ] , [ "VE" , "🇻🇪" ] , [ "VG" , "🇻🇬" ] , [ "VI" , "🇻🇮" ] , [ "VN" , "🇻🇳" ] , [ "ZA" , "🇿🇦" ]]);

let title = "  IP 纯净度查询";

let params = {
    url: API_URL,
    node: nodeName,
    timeout: 10000
};

$httpClient.get(params, (errormsg, response, data) => {
    if (errormsg) {
        let content = "</br></br>🔴 查询超时或请求失败";
        content = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: bold;">` + content + `</p>`;
        $done({"title": title, "htmlMessage": content});
        return;
    }

    if (!response || response.status !== 200 || !data) {
        let content = `</br></br>🔴 接口异常：${response ? response.status : 'unknown'}`;
        content = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: bold;">` + content + `</p>`;
        $done({"title": title, "htmlMessage": content});
        return;
    }

    try {
        let content = json2info(data);
        $done({"title": title, "htmlMessage": content});
    } catch (e) {
        let content = `</br></br>🔴 解析失败：${String(e)}`;
        content = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: bold;">` + content + `</p>`;
        $done({"title": title, "htmlMessage": content});
    }
});

function json2info(cnt) {
    let data = JSON.parse(cnt);
    console.log(data);

    let countryCode = safeValue(data.countryCode);
    let flag = countryCode && flags.get(String(countryCode).toUpperCase()) ? ` ⟦${flags.get(String(countryCode).toUpperCase())}⟧` : "";

    let nativeText = getNativeText(data);
    let ipTypeText = getIpTypeText(data);
    let humanBotRatio = getHumanBotRatio(data);
    let fraudScore = safeValue(data.fraudScore);
    let riskLevel = getRiskLevel(data.fraudScore);

    let lines = [];
    lines.push("------------------------------------");
    lines.push(formatLine("出口IP地址", safeValue(data.ip)));
    lines.push(formatLine("IP地区", joinParts([safeValue(data.country), safeValue(data.region), safeValue(data.city)]) + flag));
    lines.push(formatLine("时区", safeValue(data.timezone)));
    lines.push(formatLine("ASN", safeValue(data.asn)));
    lines.push(formatLine("ASN所属机构", safeValue(data.asOrganization)));
    lines.push(formatLine("是否原生IP", nativeText));
    lines.push(formatLine("IP属性", ipTypeText));
    lines.push(formatLine("是否住宅IP", boolText(data.isResidential)));
    lines.push(formatLine("是否广播IP", boolText(data.isBroadcast)));
    lines.push(formatLine("人机流量比", humanBotRatio));
    lines.push(formatLine("风险系数", fraudScore));
    lines.push(formatLine("风险评级", riskLevel));
    lines.push("------------------------------------");
    lines.push(`<font color=#6959CD><b>节点</b> ➟ ${nodeName}</font>`);

    let res = lines.join("</br>");
    res = `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: thin">` + res + `</p>`;
    return res;
}

function formatLine(name, value) {
    return `<b>${name}</b> : ${safeValue(value)}`;
}

function safeValue(v) {
    if (v === undefined || v === null || v === "") return "-";
    return String(v);
}

function joinParts(arr) {
    let list = arr.filter(item => item && item !== "-");
    return list.length ? list.join(" / ") : "-";
}

function boolText(v) {
    if (v === true) return "是";
    if (v === false) return "否";
    return "未知";
}

function getNativeText(data) {
    if (data.isBroadcast === true) return "否（广播/中转特征）";
    if (data.isBroadcast === false) return "倾向原生";
    return "未知";
}

function getIpTypeText(data) {
    if (data.isResidential === true) return "住宅IP";
    if (data.isResidential === false) return "机房IP";
    return "未知";
}

function getHumanBotRatio(data) {
    if (data.humanBotRatio !== undefined && data.humanBotRatio !== null && data.humanBotRatio !== "") return String(data.humanBotRatio);
    if (data.humanTrafficRatio !== undefined && data.humanTrafficRatio !== null && data.humanTrafficRatio !== "") return String(data.humanTrafficRatio);
    if (data.botHumanRatio !== undefined && data.botHumanRatio !== null && data.botHumanRatio !== "") return String(data.botHumanRatio);
    return "API 未提供";
}

function getRiskLevel(score) {
    let n = Number(score);
    if (isNaN(n)) return "未知";
    if (n >= 80) return "高风险";
    if (n >= 50) return "中风险";
    if (n >= 20) return "低风险";
    return "很低";
}
