const env = require('dotenv');
const https = require('https');
const express = require('express');
const fs = require('fs')
const { Worker } = require("worker_threads");
const { createHmac } = require('node:crypto');

env.config();

const key = fs.readFileSync('./key.pem');
const cert = fs.readFileSync('./cert.pem');
const allowedUsers = process.env.ALLOWED_USERS.split(",");
const app = express();
const server = https.createServer({ key: key, cert: cert }, app);
const re = new RegExp("^[_A-z]((-|\s)*[_A-z0-9])*$");

app.use(express.static('./static', { extensions: ['html'] }));

process.on('uncaughtException', function (err, origin) {
  let time = new Date().toString().replace(/T/, ':').replace(/\.\w*/, '');
  console.log(`Occured at: ${time}\nOrigin: ${origin}\nError: ${err}`);
});

//WEBSOCKETS

var ShareDB = require('sharedb');
var WebSocket = require('ws');
var WebSocketJSONStream = require('websocket-json-stream');

var backend = new ShareDB();
var wss = new WebSocket.Server({ server: server });

wss.on('connection', function (ws) {
  var stream = new WebSocketJSONStream(ws);
  backend.listen(stream);
});

// Helper functions

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

function checkEvil(code) {
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
  } else if (code.length > 15000) {
    beingNaughty = "Please do not make files greater than 15,000 characters long..."
  } else if (code.indexOf(".exec(") != -1) {
    beingNaughty = "Please do not try to run any console commands."
  }
  return beingNaughty;
}

const checkAdmin = async (req) => {
  return new Promise((resolve, rej) => {
    try {
      if (req.headers.authorization != undefined) {
        fs.readFile("users.json", (err, data) => {
          if (err) {
            resolve(500);
          } else {
            let users = JSON.parse("" + data);
            let admin = users[req.headers.authorization].admin;
            if (admin) {
              resolve(200);
            } else {
              resolve(401);
            }
          }
        });
      } else {
        resolve(400);
      }
    } catch (err) {
      resolve(500);
    }
  })
}

const getUser = async (auth) => {
  return new Promise((res, rej) => {
    fs.readFile("users.json", (err, data) => {
      if (err) {
        rej(err);
      }
      else {
        try {
          let users = JSON.parse("" + data);
          res(users[auth].email.split("@")[0]);
        } catch (err) {
          rej(err);
        }
      }
    })
  });
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

// POST 

app.post("/compile", async (req, res) => {
  let code = req.body;
  let beingNaughty = checkEvil(code);
  if (beingNaughty == "") {
    let user = await getUser(req.headers.authorization);
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
  } else {
    res.status(400).send(beingNaughty);
  }
})

app.post("/run", async (req, res) => {
  let code = req.body;
  let beingNaughty = checkEvil(code);
  if (beingNaughty == "") {
    let user = await getUser(req.headers.authorization);
    let filename = code.split("{")[0].trim().split(" ");
    filename = filename[filename.length - 1];
    if (re.test(filename)) {
      if (fs.existsSync(`./Users/${user}/${filename}.java`)) {
        fs.writeFile(`./Users/${user}/${filename}.java`, code, async (err) => {
          if (err) {
            res.status(500).send(err);
          } else {
            let worker = new Worker("./runJava.js", {
              "env": { "filename": user + "/" + filename },
            });
            worker.on("message", async data => {
              res.status(200).send(data);
              worker.terminate();
              terminated = true;
            });
            worker.on("error", async data => {
              try {
                code = data.code;
                message = data.stderr;
                if (code == "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
                  code = "ERR_PROCESS_STDIO_MAXBUFFER"
                  message = "Output too long! Max buffer is 16384 bytes, please reduce output or increase limit!\nOutput so far:\n" + data.stdout
                } else if (code == null) {
                  code = "ERR_PROCESS_TIMEOUT"
                  message = "Either your code is taking too long to run or there was an internal error. Please check your code for any infinite loops.";
                }
                res.status(400).send(`Code: ${code}\nMessage: ${message}`);
                worker.terminate();
                terminated = true;
              } catch (err) {
                res.status(500).send(err);
              }
            });
            // if (await checkTime(worker) && !terminated) {
            //     res.status(400).send("Infinite loop detected! Please check your code!\nOr your code is taking too long to run...");
            // }
          }
        })
      } else {
        res.status(400).send("This class file does not exist!");
      }
    } else {
      res.status(400).send("Invalid class name!")
    }
  } else {
    res.status(200).send(beingNaughty)
  }
});

app.post("/deleteFile", async (req, res) => {
  let filename = req.query.name;
  let user = await getUser(req.headers.authorization);
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
});

app.post("/register", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    const email = req.body;
    if (allowedUsers.indexOf(email.split("@")[0]) == -1) {
      res.status(500).send("You are not allowed to use this service!\nIf you believe you should be contact your admin!")
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
            data[auth] = { "email": email, "admin": false };
            let dataStr = JSON.stringify(data);
            fs.writeFile("users.json", dataStr, err => {
              if (err) {
                res.status(500).send(err);
              } else {
                fs.mkdir("Users/" + email.split("@")[0], { recursive: true }, err => {
                  if (err) {
                    res.status(500).send(err);
                  }else{
                    fs.writeFile("Users/" + email.split("@")[0] + "/shared.json", '{"files": []}', err => {
                      if(err){
                        res.status(500).send(err);
                      }else{
                        res.sendStatus(200);
                      }
                    })
                  }
                });
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
});

app.post("/updateHash", async (req, res) => {
  let filename = req.query.name;
  let user = await getUser(req.headers.authorization);
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
        if (minLength > newCode.length) {
          minLength = newCode.length;
        }
        let percent = await percent_diff(newCode, oldCode);
        if (percent > 1) {
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
      } else {
        res.status(400).send("No changes made! (hash is identical)")
      }
    }
  });
});

app.post("/shareFile", async (req, res) => {
  let filename = req.query.name;
  let toUser = req.query.user;
  let user = await getUser(req.headers.authorization);
  if(user != toUser){
    let exists = fs.existsSync(`Users/${user}/${filename}.java`);
    if(exists){
      exists = fs.existsSync(`Users/${toUser}/shared.json`);
      if(exists){
        fs.readFile(`Users/${toUser}/shared.json`, (err, data) => {
          if(err){
            res.status(500).send(err);
          }else{
            let shared = JSON.parse(data);
            shared.files.push(`${user}/${filename}`);
            fs.writeFile(`Users/${toUser}/shared.json`, JSON.stringify(shared), err => {
              if(err){
                res.status(500).send(err);
              }else{
                res.sendStatus(200);
              }
            })
          }
        })
      }else{
        res.status(400).send("This user does not exist!");
      }
    }else{
      res.status(400).send("This file does not exist!");
    }
  }else{
    res.status(400).send("You cannot share with yourself!");
  }
})

// GET

app.get("/readfile", async (req, res) => {
  let filename = req.query.name;
  let user = await getUser(req.headers.authorization);
  fs.readFile(`Users/${user}/${filename}.java`, (err, result) => {
    if (err) {
      res.status(400).send("This file does not exist!");
    }
    else {
      res.status(200).send("" + result);
    }
  })
});

app.post("/makefile", async (req, res) => {
  let filename = req.query.name;
  let user = await getUser(req.headers.authorization);
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
});

app.get("/filelist", async (req, res) => {
  let user = await getUser(req.headers.authorization);
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
});

app.get("/getFile", async (req, res) => {
  // Create new doc based off of request
  let filename = req.query.name;
  let user = await getUser(req.headers.authorization);
  if(req.query.username != undefined){
    user = req.query.username;
  }
  fs.readFile(`Users/${user}/${filename}.java`, (err, result) => {
    let connection = backend.connect();
    if (err) {
      if (filename == "Main") {
        let doc = connection.get('files', user + "." + filename);
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
                doc.create({ content: text })
                res.status(200).send({text: text, name: user + "." + filename});
              }
            })
          }
        })
      }
    }
    else {
      let text = "" + result;
      let doc = connection.get('files', user + "." + filename);
      doc.fetch(err => {
        if (err) {
          res.status(500).send(err);
        } else {
          try {
            doc.create({ content: text })
            res.status(200).send({text: text, name: user + "." + filename});
          } catch {
            // Doc already created
            res.status(200).send({text: text, name: user + "." + filename});
          }
        }
      })
    }
  })
})

// ADMIN FUNCTIONS

// GET

app.get("/serveHistory", async (req, res) => {
  let admin = (await checkAdmin(req)) == 200;
  if (admin) {
    res.sendFile("historyViewer.html", { root: __dirname });
  } else {
    res.status(401).sendFile("401.html", { root: __dirname });
  }
});

app.get("/users", async (req, res) => {
  let admin = (await checkAdmin(req)) == 200;
  if (admin) {
    fs.readdir("Users/", (err, files) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send("" + files);
      }
    });
  } else {
    res.status(401).send("You are not authorized to view this page!");
  }
});

app.get("/filelistAdmin", async (req, res) => {
  let admin = (await checkAdmin(req)) == 200;
  if (admin) {
    let user = req.query.user;
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
  } else {
    console.log(authorized);
    res.sendStatus(authorized);
  }
});

app.get("/readfileAdmin", async (req, res) => {
  let admin = (await checkAdmin(req)) == 200;
  if (admin) {
    let filename = req.query.name;
    let user = req.query.user;
    let extension = req.query.extension;
    fs.readFile(`Users/${user}/${filename}${extension}`, (err, result) => {
      if (err) {
        res.status(400).send("This file does not exist!");
      }
      else {
        res.status(200).send("" + result);
      }
    })
  } else {
    res.sendStatus(authorized);
  }
});

// POST

app.post("/compileAdmin", async (req, res) => {
  let admin = (await checkAdmin(req)) == 200;
  if (admin) {
    let code = req.body;
    let beingNaughty = checkEvil(code);
    if (beingNaughty == "") {
      let user = req.query.user;
      let filename = req.query.name;
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
    } else {
      res.status(400).send(beingNaughty);
    }
  } else {
    res.sendStatus(authorized);
  }
})

app.post("/runAdmin", async (req, res) => {
  let admin = (await checkAdmin(req)) == 200;
  if (admin) {
    let code = req.body;
    let beingNaughty = checkEvil(code);
    if (beingNaughty == "") {
      let user = req.query.user;
      let filename = req.query.name;
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
            }
          })
        } else {
          res.status(400).send("This class file does not exist!")
        }
      } else {
        res.status(400).send("Invalid class name!")
      }
    } else {
      res.status(400).send(beingNaughty);
    }
  } else {
    res.sendStatus(authorized);
  }
});

// KEEP AT BOTTOM

server.listen(443);
console.log("Now Listening");