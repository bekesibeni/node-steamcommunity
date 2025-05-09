const UserAgent = require('user-agents');
const uaParser = require('ua-parser-js');

function getUserAgent() {
    let ua;
    do {
        ua = new UserAgent();
        const parsedUA = uaParser(ua.toString());
        if (
            (parsedUA.browser.name === 'Chrome' && parseInt(parsedUA.browser.version, 10) >= 100) ||
            (parsedUA.browser.name === 'Firefox' && parseInt(parsedUA.browser.version, 10) >= 100)
        ) {
            break;
        }
    } while (true);

    return ua.toString();
}

function generateHeaders() {
    const userAgent = getUserAgent();
    const parsedUA = uaParser(userAgent);
    const { browser, os, device } = parsedUA;

    const headers = {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": parsedUA.ua,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    };

    if (browser.name === "Chrome") {
        headers["Sec-Ch-Ua"] = `"Not(A:Brand";v="99", "Google Chrome";v="${browser.major}", "Chromium";v="${browser.major}"`;
        headers["Sec-Ch-Ua-Mobile"] = device.type === "mobile" ? "?1" : "?0";
        headers["Sec-Ch-Ua-Platform"] = `"${os.name}"`;
    }

    return headers;
}

exports.headers = generateHeaders();