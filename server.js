const env = require('dotenv');
const http = require('http');
const express = require('express');
const fs = require('fs')
const { Worker } = require("worker_threads");
const { createHmac } = require('node:crypto');


env.config();

const allowedUsers = process.env.ALLOWED_USERS.split(",");
const app = express();
const server = http.createServer(app);
const re = new RegExp("^[_A-z]((-|\s)*[_A-z0-9])*$");

app.use(express.static('./static', { extensions: ['html'] }));

// Helper functions

const checkTime = async (worker) => {
    await new Promise(r => setTimeout(r, 1500));
    if (worker.threadId != -1) {
        worker.terminate();
        return true;
    }
    return false;
}

const checksum = async (message) => {
    let hash = createHmac('sha256', message).digest('base64');
    return hash;
}

function levenshtein_distance(first, second) {
    if (first.length > second.length) {
        let temp = first;
        first = second;
        second = temp;
    }
    if (second.length === 0) {
        return first.length;
    }
    const first_length = first.length + 1;
    const second_length = second.length + 1;
    const distance_matrix = Array.from({ length: first_length }, () => Array(second_length).fill(0));
    for (let i = 0; i < first_length; i++) {
        distance_matrix[i][0] = i;
    }
    for (let j = 0; j < second_length; j++) {
        distance_matrix[0][j] = j;
    }
    for (let i = 1; i < first_length; i++) {
        for (let j = 1; j < second_length; j++) {
            let deletion = distance_matrix[i - 1][j] + 1;
            let insertion = distance_matrix[i][j - 1] + 1;
            let substitution = distance_matrix[i - 1][j - 1];
            if (first[i - 1] !== second[j - 1]) {
                substitution += 1;
            }
            distance_matrix[i][j] = Math.min(insertion, deletion, substitution);
        }
    }
    return distance_matrix[first_length - 1][second_length - 1];
}

function percent_diff(first, second) {
    return 100 * levenshtein_distance(first, second) / Math.max(first.length, second.length);
}



// App functions

app.use(function (req, res, next) {
    try {
        var data = '';
        req.setEncoding('utf8');
        req.on('data', function (chunk) {
            data += chunk;
        });

        req.on('end', function () {
            req.body = data;
            next();
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post("/compile", async (req, res) => {
    try {
        let code = req.body;
        fs.readFile("users.json", async (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0]
                let filename = code.split("{")[0].trim().split(" ");
                filename = filename[filename.length - 1];
                if (re.test(filename)) {
                    if (fs.existsSync(`./Users/${user}/${filename}.java`)) {
                        fs.writeFile(`./Users/${user}/${filename}.java`, code, async (err) => {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                let worker = new Worker("./compileJava.js", {
                                    "env": { "filename": user + "/" + filename }
                                });
                                worker.on("message", async data => {
                                    res.status(200).send(data);
                                    worker.terminate();
                                });
                                worker.on("error", async data => {
                                    res.status(400).send(data);
                                    worker.terminate();
                                });
                            }
                        })
                    } else {
                        res.status(400).send("This class file does not exist!")
                    }
                } else {
                    res.status(400).send("Invalid class name!")
                }
            }
        })
    } catch (err) {
        res.status(500).send(err)
    }
})

app.post("/run", async (req, res) => {
    try {
        let code = req.body;
        let beingNaughty = "";
        if (code.indexOf("java.io.") != -1) {
            beingNaughty = "Please do not use any java.io packages in your projects!\nThis is for security reasons :)";
        } else if (code.indexOf("java.net.") != -1) {
            beingNaughty = "Please do not use any java.net packages in your projects!\nThis is for security reasons :)";
        }
        else if (code.indexOf("java.nio.") != -1) {
            beingNaughty = "Please do not use any java.nio packages in your projects!";
        }
        else if (code.indexOf("java.awt.") != -1) {
            beingNaughty = "Please do not use any java.awt packages in your projects!";
        }
        else if (code.indexOf("java.sql.") != -1) {
            beingNaughty = "Please do not use any java.sql packages in your projects!";
        }
        else if (code.indexOf("java.util.zip") != -1) {
            beingNaughty = "Please do not use the java.util.zip package in your projects!";
        }
        else if (code.indexOf("java.util.*") != -1) {
            beingNaughty = "Please import java.util packages individually!";
        }
        else if (code.indexOf("java.net.") != -1) {
            beingNaughty = "Please do not use any java.net packages in your projects!";
        }
        else if (code.indexOf("javax.") != -1) {
            beingNaughty = "Please do not use any javax packages in your projects!";
        } else if (code.indexOf("org.omg.") != -1 || code.indexOf("org.ietf.") != -1 || code.indexOf("org.w3c.") != -1 || code.indexOf("org.xml.") != -1) {
            beingNaughty = "What are you even importing these packages for? Don't please. :)";
        }
        if (beingNaughty == "") {
            fs.readFile("users.json", async (err, haha) => {
                if (err) {
                    res.status(500).send(err);
                } else {
                    let users = JSON.parse("" + haha);
                    let user = users[req.headers.authorization].split("@")[0]
                    let filename = code.split("{")[0].trim().split(" ");
                    filename = filename[filename.length - 1];
                    if (re.test(filename)) {
                        if (fs.existsSync(`./Users/${user}/${filename}.java`)) {
                            fs.writeFile(`./Users/${user}/${filename}.java`, code, async (err) => {
                                if (err) {
                                    res.status(500).send(err);
                                } else {
                                    let worker = new Worker("./runJava.js", {
                                        "env": { "filename": user + "/" + filename }
                                    });
                                    worker.on("message", async data => {
                                        res.status(200).send(data);
                                        worker.terminate();
                                    });
                                    worker.on("error", async data => {
                                        res.status(400).send(data);
                                        worker.terminate();
                                    });
                                    if (await checkTime(worker)) {
                                        res.status(400).send("Infinite loop detected! Please check your code!\nOr your code is taking too long to run...");
                                    }
                                }
                            })
                        } else {
                            res.status(400).send("This class file does not exist!");
                        }
                    } else {
                        res.status(400).send("Invalid class name!")
                    }
                }
            })
        } else {
            res.status(200).send(beingNaughty)
        }
    } catch (err) {
        res.status(500).send(err)
    }
});

app.post("/login", async (req, res) => {
    try {
        let key = req.body;
        fs.readFile("users.json", (err, users) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let x = Object.keys(JSON.parse("" + users));
                if (x.indexOf(key) != -1) {
                    res.sendStatus(200);
                }
                else {
                    res.sendStatus(401);
                }
            }
        });
    } catch (err) {
        res.status(500).send(err);
    }
})

app.post("/register", async (req, res) => {
    try {
        const auth = req.headers.authorization;
        const email = req.body;
        if (allowedUsers.indexOf(email.split("@")[0]) == -1) {
            res.status(500).send("You are not allowed to use this service!\nIf you believe you should be contact your teacher!")
        } else {
            fs.readFile("users.json", (err, data) => {
                if (err) {
                    res.status(500).send(err);
                } else {
                    data = JSON.parse("" + data);
                    keys = Object.keys(data);

                    let funny = false;

                    for (i in keys) {
                        test = keys[i];
                        if (data[test] == email) {
                            funny = true;
                            break;
                        }
                    }

                    if (!funny) {
                        data[auth] = email;
                        let dataStr = JSON.stringify(data);
                        fs.writeFile("users.json", dataStr, err => {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                fs.mkdir("Users/" + email.split("@")[0], { recursive: true }, err => {
                                    if (err) {
                                        res.status(500).send(err);
                                    }
                                });
                                res.sendStatus(200);
                            }
                        })
                    } else {
                        res.statusMessage = "You already have an account! See your teacher for your password";
                        res.status(400).send("You already have an account! See your teacher for your password");
                    }
                }
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
})

app.get("/readfile", (req, res) => {
    try {
        let filename = req.query.name;
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0];
                fs.readFile(`Users/${user}/${filename}.java`, (err, result) => {
                    if (err) {
                        res.status(400).send("This file does not exist!");
                    }
                    else {
                        res.status(200).send("" + result);
                    }
                })
            }
        })
    } catch (err) {
        res.status(500).send(err);
    }
})

app.post("/makefile", (req, res) => {
    try {
        let filename = req.query.name;
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0];
                if (re.test(filename)) {
                    let baseCode = [`class ${filename} {`, '\tpublic static void main(String[] args){', '\t\tSystem.out.println("Hello world!");', '\t}', '}'].join('\n');
                    fs.writeFile(`Users/${user}/${filename}.java`, baseCode, async (err) => {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            let hash = await checksum(baseCode);
                            let time = Date.now();
                            let changes = {
                                "history": [time],
                                "hashes": [hash],
                                "lastCode": baseCode,
                                "majorChanges": [baseCode],
                                "majorChangesTime": [time]
                            }
                            fs.writeFile(`Users/${user}/${filename}.json`, JSON.stringify(changes), err => {
                                if (err) {
                                    res.status(500).send(err);
                                } else {
                                    res.sendStatus(200);
                                }
                            })
                        }
                    })
                } else {
                    res.status(400).send("Invalid class name!")
                }
            }
        })
    } catch (err) {
        res.status(500).send(err);
    }
})

app.get("/filelist", (req, res) => {
    try {
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0];
                fs.readdir(`Users/${user}/`, (err, files) => {
                    result = "";
                    files.forEach(file => {
                        let temp = file.split(".");
                        if (temp[temp.length - 1] == "java") {
                            result += file + ",";
                        }
                    });
                    res.status(200).send(result.substring(0, result.length - 1));
                });
            }
        })
    } catch (err) {
        res.status(500).send(err);
    }
})

app.post("/deleteFile", (req, res) => {
    try {
        let filename = req.query.name;
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0];
                fs.unlink(`Users/${user}/${filename}.java`, err => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        fs.unlink(`Users/${user}/${filename}.json`, err => {
                            if (err) {
                                res.status(500).send(err)
                            } else {
                                fs.unlink(`Users/${user}/${filename}.class`, err => {
                                    if (err) {
                                        res.status(500).send(`Deleted ${filename}.java but failed to delete ${filename}.class`);
                                    } else {
                                        res.status(200).send(`Deleted ${filename}.java & ${filename}.class`);
                                    }
                                });
                            }
                        });
                    }
                })
            }
        });
    } catch (err) {
        res.status(500).send(err);
    }
})

app.post("/updateHash", (req, res) => {
    try {
        let filename = req.query.name;
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0];
                fs.readFile(`Users/${user}/${filename}.json`, async (err, funny) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        let changes = JSON.parse("" + funny);
                        let newCode = "" + req.body;
                        let oldCode = "" + changes.lastCode;
                        let hashes = changes.hashes;
                        let oldhash = hashes[hashes.length - 1];
                        let newhash = await checksum(newCode);
                        if (oldhash != newhash) {
                            let time = Date.now();
                            changes.history.push(time);
                            changes.hashes.push(newhash);
                            changes.lastCode = newCode;

                            minLength = oldCode.length;
                            if(minLength > newCode.length){
                                minLength = newCode.length;
                            }
                            let percent = await percent_diff(newCode, oldCode);
                            if(percent > 1){
                                changes.majorChanges.push(newCode);
                                changes.majorChangesTime.push(time);
                            }
                            changes = JSON.stringify(changes);
                            fs.writeFile(`Users/${user}/${filename}.json`, changes, err => {
                                if (err) {
                                    res.status(500).send(err);
                                }
                                else {
                                    res.status(200).send("Updated hash!")
                                }
                            })
                        }else{
                            res.status(400).send("No changes made! (hash is identical)")
                        }
                    }
                });
            }
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

server.listen(80);
console.log("Now Listening");