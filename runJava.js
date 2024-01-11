const { parentPort } = require("worker_threads");
const path = require("path");
const shell = require("shelljs");
let filename = process.env.filename;
let maxBuffer = 16384;
let temp = `cd "${path.join(__dirname, `/Users/${filename.split("/")[0]}/`)}" & javac ${filename.split("/")[1]}.java & java ${filename.split("/")[1]}`
shell.exec(temp, { silent: true, async:true, maxBuffer:maxBuffer }, async (code, stdout, stderr) => {
    if(code=="ERR_CHILD_PROCESS_STDIO_MAXBUFFER") stderr = `Your code is outputting too much!\nDo you have an infinite loop?\nOutput limit is ${maxBuffer} bytes to avoid spam.\nOutput so far:\n${stdout}`;
    if (stderr.trim() != "") {
        parentPort.postMessage(stderr);
    } else {
        parentPort.postMessage(stdout);
    }
});