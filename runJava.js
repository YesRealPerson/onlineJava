try {
    const { parentPort } = require("worker_threads");
    const util = require('util');
    const exec = util.promisify(require("child_process").execFile)
    const path = require("path");
    let filename = process.env.filename;
    let runPath = path.join(__dirname, `/Users/${filename.split("/")[0]}/`)
    filename = filename.split("/")[1]
    let maxBuffer = 16384;

    let gogogo = async () => {
        let { compileOut, compileErr } = await exec(("javac"), [`${filename}.java`], {
            cwd: runPath,
        })
        if (compileErr != "undefined") {
            let { stdout, stderr } = await exec(("java"), [filename], {
                cwd: runPath,
                maxBuffer: maxBuffer,
                timeout: 2500,
            })
            parentPort.postMessage("Output:\n"+stdout + "\nErrors:\n" + stderr);
        } else {
            parentPort.postMessage("Failed to compile!\n" + compileOut + "\n" + compileErr);
        }
    }

    gogogo();
} catch (err) {
    console.log("UHOH\n"+err);
    parentPort.postMessage("Internal server error!\n"+err);
}