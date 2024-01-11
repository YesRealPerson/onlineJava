const { parentPort } = require("worker_threads");
const path = require("path");
const shell = require("async-shelljs");
let filename = process.env.filename;

let temp = `cd "${path.join(__dirname, `/Users/${filename.split("/")[0]}/`)}" & javac ${filename.split("/")[1]}.java & java ${filename.split("/")[1]}`
shell.exec(temp, async (code, stdout, stderr) => {
    if (stderr.trim() != "") {
        parentPort.postMessage(stderr);
    } else {
        parentPort.postMessage(stdout);
    }
});