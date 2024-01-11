const login = async () => {
    let encoded = document.getElementById("name").value + ":" + document.getElementById("password").value
    encoded = CryptoJS.SHA256(encoded).toString(CryptoJS.enc.Base64);
    let response = await fetch("./login", {
        method: "POST",
        body: encoded
    })
    if(response.status == 200){
        document.cookie = "key="+encoded;
        window.location = "./editor";
    }else{
        document.getElementById("error").innerText = "Invalid username/password!"
    }
}
const registerWindow = async () => {
    window.location = "./registerSite";
}
const loginWindow = async () => {
    window.location = "./loginSite";
}
const checkLogin = async (encoded, location) => {
    let response = await fetch("./login", {
        method: "POST",
        body: encoded
    })
    if(response.status != 200){
        window.location = location;
    }
}

const register = async () => {
    let response = await fetch("./register", {
        method: "POST",
        headers: {
            "Authorization": CryptoJS.SHA256(document.getElementById("name").value + ":" + document.getElementById("password").value).toString(CryptoJS.enc.Base64)
        },
        body: document.getElementById("email").value
    })
    if(response.status == 200){
        window.location = "./loginSite"
    }else{
        document.getElementById("error").innerText = await response.text();
    }
}