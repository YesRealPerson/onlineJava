const sendRunRequest = async () => {
    const response = await fetch("./run", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": document.cookie.split("=")[1]
        },
        body: editor.getValue()
    })
    document.getElementById("console").innerText= await response.text()
}

const getFile = async (filename) => {
    const response = await fetch("./readfile?name="+filename, {
        method: 'GET',
        headers: {
            "Authorization": document.cookie.split("=")[1]
        },
    })
    editor.getModel().setValue(await response.text());
}

const readFiles = async () => {
    const response = await fetch("./filelist", {
        method: 'GET',
        headers: {
            "Authorization": document.cookie.split("=")[1]
        },
    })
}