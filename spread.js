const fs = require("fs");
const { createHmac } = require('node:crypto');

let filename = "test";
let time = Date.now();

const checksum = async (message) => {
    let hash = createHmac('sha256', message).digest('base64');
    return hash;
}

fs.readFile("users.json", (err, haha) => {
    if (err) {
        res.status(500).send(err);
    } else {
        let users = JSON.parse("" + haha);
        let keys = Object.keys(users);
        let folders = [];
        for (i in keys) {
            let key = keys[i];
            folders.push(users[key].split("@")[0]);
        }
        let pathSrc = `toSpread/${filename}`;
        if (fs.existsSync(pathSrc+".java")) {
            fs.readFile(pathSrc+".java", (err, data) => {
                if (err) {
                    console.error(err);
                } else {
                    let baseCode = ""+data;
                    for (i in folders) {
                        let pathDest = `Users/${folders[i]}/${filename}`;
                        fs.copyFile(pathSrc+".java", pathDest+".java", fs.constants.COPYFILE_EXCL, async (err) => {
                            if (err) {
                                console.log("Error!!!!\n" + err);
                            } else {
                                let changes = {
                                    "history": [time],
                                    "hashes": [await checksum(baseCode)],
                                    "lastCode": baseCode,
                                    "majorChanges": [baseCode],
                                    "majorChangesTime": [time]
                                }
                                fs.writeFile(pathDest+".json", JSON.stringify(changes), err => {
                                    if (err) {
                                        console.log(err);
                                    }
                                })
                            }
                        })
                    }
                }
            })
        } else {
            console.error("Invalid file name!")
        }
    }
})