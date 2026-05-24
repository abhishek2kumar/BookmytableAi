const https = require('https');
const PaytmChecksum = require('paytmchecksum');

async function test() {
    var paytmParams = {};
    const orderId = 'ORD_' + Date.now();
    paytmParams.body = {
        'requestType': 'Payment',
        'mid': 'ZZUTMz05213521592016',
        'websiteName': 'WEBSTAGING',
        'orderId': orderId,
        'callbackUrl': 'http://localhost:3000/api/paytm/callback',
        'txnAmount': {
            'value': '1.00',
            'currency': 'INR',
        },
        'userInfo': {
            'custId': 'CUST_001',
        },
    };

    // Try without &nZy to see if error changes, or use the literal key
    const merchantKey = "z%b4_fEHUHkW&nZy";
    
    const checksum = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), merchantKey);
    paytmParams.head = { signature: checksum };

    const post_data = JSON.stringify(paytmParams);
    console.log("POST DATA: ", post_data);

    const options = {
        hostname: 'securegw-stage.paytm.in',
        port: 443,
        path: '/theia/api/v1/initiateTransaction?mid=ZZUTMz05213521592016&orderId=' + orderId,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': post_data.length
        }
    };

    let response = '';
    const post_req = https.request(options, function (post_res) {
        post_res.on('data', chunk => response += chunk);
        post_res.on('end', () => console.log("RESPONSE", response));
    });

    post_req.write(post_data);
    post_req.end();
}
test();
