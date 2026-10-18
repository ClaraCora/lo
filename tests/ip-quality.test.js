const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createHash, createPublicKey, verify } = require("node:crypto");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const scripts = ["IPQualityDetection.js", "cora/IPQualityDetection.js"];
const quality = { ip: "203.0.113.1", country: "Japan", asn: 64500, fraudScore: 0, isResidential: true, isBroadcast: false };
const goodGemini = '<html><script>window.WIZ_global_data={"flags":"{\\\"45631641\\\":true}"};</script><body>Gemini</body></html>';

function locationBody(place, source = "SWML_DESCRIPTION_FROM_YOUR_INTERNET_ADDRESS") {
    return ")]}'\n\n417\n" + JSON.stringify([
        ["wrb.fr", "K4WWud", JSON.stringify([[place, source, false, null]]), null, null, null, "generic"],
        ["di", 34]
    ]);
}

async function runScript(file, overrides = {}, node = "测试节点") {
    const calls = [];
    const outputs = [];
    const defaults = {
        quality: { status: 200, body: JSON.stringify(quality) },
        location: { status: 200, body: locationBody("Tokyo, Japan") },
        gemini: { status: 200, body: goodGemini }
    };
    function transport(method, options, callback) {
        const key = options.url.includes("ippure") ? "quality" : options.url.includes("batchexecute") ? "location" : "gemini";
        calls.push({ method, ...options });
        const reply = { ...defaults[key], ...overrides[key] };
        if (reply.throws) throw new Error("Transport unavailable");
        setImmediate(() => callback(reply.error || null, reply.noResponse ? null : reply.statusCodeOnly ? { statusCode: String(reply.status) } : { status: reply.status }, reply.body));
    }
    vm.runInNewContext(readFileSync(path.join(root, file), "utf8"), {
        $environment: { params: { node } },
        $httpClient: {
            get: (options, callback) => transport("get", options, callback),
            post: (options, callback) => transport("post", options, callback)
        },
        $done: output => outputs.push(output)
        // No timers, fetch, require, URL or Intl: matches Cora's minimal JS API.
    }, { timeout: 1000, filename: file });
    assert.equal(calls.length, 3, "All independent checks start before any response");
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(outputs.length, 1, "$done must run exactly once");
    for (const call of calls) {
        assert.equal(call.node, node);
        assert.match(call.url, /^https:\/\//);
        assert.ok(call.timeout <= 10000);
    }
    const rpc = calls.find(call => call.method === "post");
    assert.equal(rpc.headers["Accept-Language"], "en-US,en;q=0.9");
    assert.equal(JSON.parse(new URLSearchParams(rpc.body).get("f.req"))[0][0][0], "K4WWud");
    return outputs[0].htmlMessage;
}

for (const file of scripts) {
    test(file + ": parallel checks and independent Google/Gemini results", async () => {
        const output = await runScript(file);
        assert.match(output, /出口 IP：203\.0\.113\.1/);
        assert.match(output, /风险系数：0/);
        assert.match(output, /风险评级：很低/);
        assert.match(output, /Google 地区：Tokyo, Japan/);
        assert.match(output, /Google 送中：未送中/);
        assert.match(output, /Gemini 解锁：已解锁/);
        assert.doesNotMatch(output, /原始字段/);
    });

    for (const [place, expected] of [
        ["Beijing, China", "已送中（中国大陆）"],
        ["China", "已送中（中国大陆）"],
        ["Hong Kong", "未送中"],
        ["Macao", "未送中"],
        ["Macau", "未送中"],
        ["Hong Kong, China", "未送中（港澳台地区）"],
        ["Macao, China", "未送中（港澳台地区）"],
        ["Taipei, Taiwan", "未送中"],
        ["Taiwan, China", "未送中（港澳台地区）"],
        ["Berlin, Germany", "未送中"],
        ["United States", "未送中"],
        ["Beijing", "无法判断（定位未包含可识别的国家/地区）"],
        ["Beijing, Beijing", "无法判断（定位未包含可识别的国家/地区）"]
    ]) {
        test(file + ": Google location " + place, async () => {
            const output = await runScript(file, { location: { body: locationBody(place) } });
            assert.ok(output.includes("Google 送中：" + expected));
        });
    }

    for (const body of ["<html>Consent required</html>", ")]}'\n[[", "null", locationBody("Beijing, China", "PRECISE_LOCATION")]) {
        test(file + ": unknown or non-IP Google location " + body.slice(0, 24), async () => {
            const output = await runScript(file, { location: { body } });
            assert.match(output, /Google 送中：无法判断/);
            assert.match(output, /Gemini 解锁：已解锁/);
        });
    }

    for (const [reply, expected] of [
        [{ body: "<html>Sign in to Gemini</html>" }, "无法判断"],
        [{ body: "<script>[45631641,null,true]</script>" }, "已解锁"],
        [{ body: "<script>[45631641,null,false]</script>" }, "未解锁"],
        [{ body: '<html><script>{"45631641":false}</script></html>' }, "未解锁"],
        [{ body: "<html>Gemini isn't available in your country.</html>" }, "未解锁（所在地区暂不支持）"],
        [{ body: "<html>Gemini isn’t available in your country.</html>" }, "未解锁（所在地区暂不支持）"],
        [{ body: "<html>Gemini is not currently supported in your region.</html>" }, "未解锁（所在地区暂不支持）"],
        [{ body: "<html>Not supported in your region.</html>" }, "未解锁（所在地区暂不支持）"],
        [{ body: "<html>Unusual traffic from your computer network.</html>" }, "检测受限"],
        [{ body: "<html>Verify you're a human</html>" + goodGemini }, "检测受限"],
        [{ status: 403 }, "检测受限"],
        [{ status: 429 }, "检测受限"],
        [{ status: 500 }, "接口异常"],
        [{ status: 302, body: "Redirect to consent" }, "接口异常"],
        [{ error: "timeout" }, "请求超时或节点无响应"],
        [{ noResponse: true }, "请求超时或节点无响应"],
        [{ body: "" }, "响应为空"],
        [{ throws: true }, "请求超时或节点无响应"]
    ]) {
        test(file + ": Gemini " + JSON.stringify(reply), async () => {
            const output = await runScript(file, { gemini: reply });
            assert.ok(output.includes("Gemini 解锁：" + expected));
            assert.match(output, /Google 地区：Tokyo, Japan/);
        });
    }

    test(file + ": translation strings in scripts do not imply a region block", async () => {
        const output = await runScript(file, { gemini: { body: goodGemini + '<script>var translation="Gemini is not available in your country"</script>' } });
        assert.match(output, /Gemini 解锁：已解锁/);
    });

    test(file + ": truncated script translations do not imply a region block", async () => {
        const output = await runScript(file, { gemini: { body: goodGemini + '<script>var translation="Gemini is not available in your country"' } });
        assert.match(output, /Gemini 解锁：已解锁/);
    });

    for (const body of ["bad JSON", "null", "[]", "{}", '{"error":"rate limit"}', '{"ip":{}}', '{"ip":{"toString":null}}']) {
        test(file + ": invalid quality response " + body, async () => {
            const output = await runScript(file, { quality: { body } });
            assert.match(output, /IP 质量：/);
            assert.match(output, /Google 送中：未送中/);
            assert.match(output, /Gemini 解锁：已解锁/);
        });
    }

    test(file + ": all requests fail without aborting result output", async () => {
        const output = await runScript(file, { quality: { error: "timeout" }, location: { error: "timeout" }, gemini: { error: "timeout" } });
        assert.match(output, /IP 质量：请求超时/);
        assert.match(output, /Google 送中：无法判断/);
        assert.match(output, /Gemini 解锁：请求超时/);
    });

    test(file + ": statusCode strings, HTML escaping and finite risk scores", async () => {
        for (const fraudScore of [undefined, null, "", " ", false, true, [], {}, "NaN", "Infinity", -1, 101]) {
            const output = await runScript(file, { quality: { statusCodeOnly: true, body: JSON.stringify({ ...quality, fraudScore, country: "<img src=x onerror=alert(1)>" }) } }, "<b>test & node</b>");
            assert.match(output, /风险评级：未知/);
            assert.match(output, /风险系数：未知/);
            assert.doesNotMatch(output, /<img|<b>test/);
            assert.match(output, /节点：&lt;b&gt;test &amp; node&lt;\/b&gt;/);
        }
        for (const [fraudScore, expected] of [["0", "很低"], [19, "很低"], [20, "低风险"], [50, "中风险"], [80, "高风险"], [100, "高风险"]]) {
            const output = await runScript(file, { quality: { body: JSON.stringify({ ...quality, fraudScore }) } });
            assert.ok(output.includes("风险评级：" + expected));
        }
    });
}

test("Loon and Cora use identical detection logic", () => {
    assert.equal(readFileSync(path.join(root, scripts[0]), "utf8"), readFileSync(path.join(root, scripts[1]), "utf8"));
});

test("Cora manifest hashes and Ed25519 signature match the app trust key", () => {
    const manifestBytes = readFileSync(path.join(root, "cora/manifest.json"));
    const manifest = JSON.parse(manifestBytes);
    for (const script of manifest.scripts) {
        const data = readFileSync(path.join(root, "cora", path.basename(script.scriptURL)));
        assert.equal(createHash("sha256").update(data).digest("hex"), script.sha256);
    }
    const publicKey = createPublicKey({
        key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from("zW2SsWm6+muJOGUp5j9KLOlQDouV+d8IKzq+aL/5Wnk=", "base64")]),
        format: "der",
        type: "spki"
    });
    const signature = Buffer.from(readFileSync(path.join(root, "cora/manifest.sig"), "utf8").trim(), "base64");
    assert.ok(verify(null, manifestBytes, publicKey, signature));
});
