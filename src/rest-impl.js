const fs = require('fs');
const request = require('request');
const jwt = require('jsonwebtoken');

let accountJSON = require('../account_jwt.json');
const SomeAPIJSON = require('../SomeAPI.json');

const privateKey = SomeAPIJSON.private_key;

let now_sec = Date.now() / 1000;
accountJSON.exp = now_sec + 3600;
accountJSON.iat = now_sec;
let account_api_jwt = jwt.sign(accountJSON, privateKey, {algorithm: 'RS256'});

let auth_grant_type = "urn:ietf:params:oauth:grant-type:jwt-bearer";

function promiseRequest(option) {
    return new Promise((resolve, reject) => {
        request(option, (err, response, body) => {
            if (err) reject(err);

            const statusCode = response.statusCode;
            console.log('path: ', option.url);
            console.log('status: ', statusCode + "  " + response.statusMessage);
            if (statusCode === 200) {
                resolve(body);
            }
        });
    });
}

function getFilesList(access_token, filesList) {
    let option = {
        method: 'GET',
        url: "https://www.googleapis.com/drive/v2/files?access_token=" + access_token,
        headers: {
            'content-type': 'application/json',
            // 'authorization': 'Bearer ' + access_token
        }
    };

    return request.get(option, (err, response, body) => {
            const statusCode = response.statusCode;
            // console.log('path: ', option.url);
            console.log('status: ', statusCode + "  " + response.statusMessage);
            if (statusCode === 200) {
                const bodyParsed = JSON.parse(body);
                const items = bodyParsed.items;
                items.forEach(item => {
                    const mimeType = item.mimeType;
                    const format = mimeType.slice(mimeType.indexOf('/') + 1, mimeType.length);
                    const originalFilename = item.originalFilename;
                    filesList.push({
                        fileName: originalFilename.trim(),
                        fileFormat: format,
                        fileId: item.id.trim()
                    });
                    console.log(originalFilename + "." + format);
                });
            }
        }
    );
}

function downloadFile(access_token, filesList) {
    console.log("Enter file name: ");
    let stdin = process.openStdin();
    stdin.on("data", (input) => {
        let id = null;

        input = input.toString().trim();
        filesList.forEach(item => {
            if ((item.fileName + "." + item.fileFormat) === input) {
                id = item.fileId;
            }
        });

        if (id === null) {
            console.log(`No such file ${input}! (downloading)`);
            process.exit();
        } else {
            let option = {
                method: 'GET',
                url: 'https://www.googleapis.com/drive/v2/files/' + id + '?alt=media',
                headers: {
                    'content-type': 'application/pdf',
                    'authorization': 'Bearer ' + access_token
                }
            };
            request.get(option).pipe(fs.createWriteStream(input));
            console.log(`File ${input} successfully downloaded`);
            // process.exit();
        }
    });
}

function insertFile(accessToken) {
    console.log("Enter path to file:");

    let stdin = process.openStdin();

    stdin.on("data", (input) => {
        input = input.toString().trim();

        let option = {
            metadata: {
                title: 'somefile',
                // mimeType: 'text/html'
            },
            method: 'POST',
            url: "https://www.googleapis.com/upload/drive/v2/files?uploadType=media",
            headers: {
                'authorization': 'Bearer ' + accessToken
            },
            body: fs.createReadStream(input).on("error", () => {
            })
        };

        request(option);
        // process.exit();
    });
}

function deleteFile(accessToken, filesList) {
    console.log("Enter file name:");

    let stdin = process.openStdin();
    stdin.on("data", (input) => {
        input = input.toString().trim();

        let id = null;
        filesList.forEach(item => {
            if ((item.fileName + "." + item.fileFormat) === input) {
                id = item.fileId.trim();
            }
        });

        if (id === null) {
            console.log(`No such file ${input}! (deleting)`);
            process.exit();
        } else {
            console.log(id);
            let option = {
                method: 'DELETE',
                url: 'https://www.googleapis.com/drive/v2/files/' + id,
                headers: {
                    // 'content-type': 'text/html',
                    'authorization': 'Bearer ' + accessToken
                }
            };
            request(option);
            console.log(`File ${input} successfully deleted`);
            // process.exit();
        }
    });
}

function updateFile(accessToken) {
    console.log("Waiting for implementing");
}

function menu(accessToken) {
    let filesList = [];

    console.log("Choose action: \n" +
        "1 - read all files\n" +
        "2 - download certain file\n" +
        "3 - insert file\n" +
        "4 - update file\n" +
        "5 - delete file\n" +
        "0 - exit");
    let stdin = process.openStdin();
    stdin.addListener("data", (input) => {
        switch (input.toString().trim()) {
            case "1":
                getFilesList(accessToken, filesList);
                break;
            case "2":
                downloadFile(accessToken, filesList);
                break;
            case "3":
                insertFile(accessToken);
                break;
            case "4":
                updateFile(accessToken);
                break;
            case "5":
                deleteFile(accessToken, filesList);
                break;
            case "0":
                process.exit();
        }
    });
}

promiseRequest({
    method: 'POST',
    url: 'https://oauth2.googleapis.com/token',
    headers: {'content-type': 'application/json'},
    form: {
        grant_type: auth_grant_type,
        assertion: account_api_jwt
    }
})
    .then(body => {
        let body_json = JSON.parse(body);
        let accessToken = body_json.access_token;
        console.log("access token: ", accessToken);

        menu(accessToken);
    })
    .catch(err => {
        console.log(new Error(err));
    });

// function get_access_token(response, body, callback) {
//     console.log("Obtaining of access token");
//     console.log('path: ', options.url);
//     console.log('status: ', response.statusCode + "  " + response.statusMessage);
//
//     let body_json = JSON.parse(body);
//     let access_token = body_json.access_token;
//     // set_token(access_token);
//     callback(access_token);
// }
//
// let filesList;
// function get_files_list(access_token, callback) {
//     options = {
//         method: 'GET',
//         url: "https://www.googleapis.com/drive/v2/files?access_token=" + access_token,
//         headers: {
//             'content-type': 'application/json'
//             // 'authorization': 'Bearer ' + access_token
//         },
//     };
//
//     request.get(options, (err, response, body) => {
//         if (err) console.log(new Error(err));
//         // console.log(body);
//         filesList = body.items;
//         callback(body);
//     });
// }
//
// request(options, (err, response, body) => {
//     if (err) throw new Error(err);
//     get_access_token(response, body, (access_token) => {
//         console.log("Access toke n: ", access_token);
//
//         let filesList = get_files_list(access_token, (body) => {
//                 // console.log(body);
//         });
//
//         // for ()
//
//         options = {
//             method: 'GET',
//             url: 'https://www.googleapis.com/drive/v2/files/0B2IBSaKMgL0fc3RhcnRlcl9maWxl?alt=media',
//             // url: "https://www.googleapis.com/drive/v2/files?access_token=" + access_token,
//             headers: {
//                 'content-type': 'application/pdf',
//                 'authorization': 'Bearer ' + access_token
//             },
//         };
//
//         let request1 = request.get(options);
//         request1.pipe(fs.createWriteStream("Getting-started.pdf"));
//
//         request(options, (err, response, body) => {
//             if (err) throw new Error(err);
//
//             console.log(filesList);
//
//             console.log('path: ', options.url);
//             console.log('status: ', response.statusCode + "  " + response.statusMessage);
//
//             if (response.statusCode !== 200) console.log(body);
//             else {
//                 let stream = fs.createWriteStream("Getting started.pdf");
//                 stream.once('open', (fd) => {
//                     stream.write(body);
//                 })
//             }
//         });
//     });
// });
//
