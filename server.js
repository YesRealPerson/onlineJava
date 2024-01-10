const http = require('http');
const express = require('express');
const shell = require("shelljs");
const fs = require('fs')
const path = require("path");

const app = express();
const server = http.createServer(app);

app.use(express.static('./static'));

// Helper functions

const base = "./Users/"
const runProgram = (filename) => {
    return new Promise((res, rej) => {
        let temp = `cd "${path.join(__dirname, `/Users/${filename.split("/")[0]}/`)}" & javac ${filename.split("/")[1]}.java & java ${filename.split("/")[1]}`
        shell.exec(temp, async (code, stdout, stderr) => {
            if (code) {
                res(stderr);
            } else {
                res(stdout);
            }
        });
    })
}

// App functions

app.use(function (req, res, next) {
    var data = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
        data += chunk;
    });

    req.on('end', function () {
        req.body = data;
        next();
    });
});

app.post("/run", async (req, res) => {
    try {
        let code = req.body;
        fs.readFile("users.json", (err, haha) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let users = JSON.parse("" + haha);
                let user = users[req.headers.authorization].split("@")[0]
                let filename = code.split("{")[0].trim().split(" ");
                filename = filename[filename.length - 1];
                fs.writeFile(`./Users/${user}/${filename}.java`, code, async (err) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        result = await runProgram(`${user}/${filename}`)
                        res.status(200).send(result);
                    }
                })
            }
        })
    } catch (err) {
        res.status(500).send(err)
    }
});

app.post("/login", async (req, res) => {
    let key = req.body;
    await fs.readFile("users.json", (err, users) => {
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
})

app.post("/register", async (req, res) => {
    const data = req.body.split(",");
    const email = data[0];
    const key = btoa(data[1] + ":" + data[2]);
    await fs.readFile("users.json", (err, data) => {
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
                data[key] = email;
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
                        fs.writeFile(`Users/${user}/${filename}.java`, [`class ${filename} {`, '\tpublic static void main(String[] args){', '\t\tSystem.out.println("Hello world!");', '\t}', '}'].join('\n'), (err) => {
                            if (err) {
                                res.status(500).send(err);
                            } else {
                                res.status(200).send([`class ${filename} {`, '\tpublic static void main(String[] args){', '\t\tSystem.out.println("Hello world!");', '\t}', '}'].join('\n'))
                            }
                        })
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
                fs.writeFile(`Users/${user}/${filename}.java`, [`class ${filename} {`, '\tpublic static void main(String[] args){', '\t\tSystem.out.println("Hello world!");', '\t}', '}'].join('\n'), (err) => {
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        res.sendStatus(200)
                    }
                })
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

server.listen(80);
console.log("Now Listening");