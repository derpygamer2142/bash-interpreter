const input = document.querySelector("input")
const output = document.getElementById("output")

import { execute, VirtualFileSystem, cwd } from "./interpreter.js"

function put(string) {
    const p = document.createElement("p");

    string = string.replaceAll("\n", "<br />");
    // You can do xss if you want, who cares.

    p.innerHTML = string;
    output.appendChild(p);
}

function getCWDAsString() {
    const path = [];
    let parent = cwd
    while (parent) {
        path.unshift(parent.name)

        parent = parent.parent
    }

    return path.join("/")
}

input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return
    put(`${getCWDAsString()}$ ` + input.value)
    const result = execute(input.value)
    input.value = ""
    
    put(result.stdout);
    if (result.code === 67) {
        // Power off exit code. Kind of hacky.
        put("Power off.")
        document.removeChild(input)
    }

    // console.log(result.stdout)
    console.log("Exited with code: " + result.code)
    console.log(VirtualFileSystem)
    input.focus()
})