const input = document.querySelector("input")
const output = document.querySelector("output")

class FSFile {
    constructor(parent, name, content) {
        this.parent = parent
        this.name = name
        this.type = "FILE"
        this.content = content

    }

    ls() {
        return this.name
    }

    rm() {
        delete this.parent.children[this.name]
    }

    write(content) {
        this.content = content
    }
}

class FSDirectory {
    constructor(parent, name) {
        this.parent = parent
        this.name = name
        this.children = {}
        this.type = "DIR"

    }

    ls() {
        return Object.values(this.children)
    }

    rm() {
        if (this.parent) delete this.parent.children[this.name]
        else this.children = {}
    }

    write(file, content) {
        this.children[file] = new FSFile(this, file, content)
    }
}

const VFS = new FSDirectory(null, "")
let workingDir = VFS

const temp = new FSDirectory(VFS, "somedir")
temp.write("skibidi.rizz", "only in ohio!!!11!11!")
VFS.children["somedir"] = temp

VFS.write("README.txt", "Hello, world!\nThis is some test text, I hope you enjoy it!")

// a bit of an odd way to store commands, but it works

const COMMANDS = {
    /**
     * 
     * @param {string} stdin 
     * @param {FSDirectory} dir 
     * @param {string[]} args 
     * @returns 
     */
    cat: (stdin, dir, args) => {
        let stdout = ""
        if (args.length < 1) {
            return { stdout: stdin, dir: dir }
        }
        else {
            const params = extractAllParams(args)

            // todo: param handling

            for (let i = args.findIndex((a) => a[0] !== "-" || a === "-"); i < args.length; i++) {
                const v = args[i]
                if (v === "-") {
                    stdout += `${stdin}\n`
                }
                else if (dir.children[v]?.type === "FILE") {
                    stdout += dir.children[v].content + "\n"
                }
            }

            return { stdout: stdout, dir: dir }
        }
    },

    /**
     * 
     * @param {string} stdin 
     * @param {FSDirectory} dir 
     * @param {string[]} args 
     * @returns 
     */
    echo: (stdin, dir, args) => {
        let stdout = ""
        const params = extractAllParams(args)
        stdout += args.slice(args.findIndex((a) => a[0] !== "-")).join(" ")
        
        if (!params.includes("n")) stdout += "\n"

        return { stdout: stdout, dir: dir }
    },

    /**
     * 
     * @param {string} stdin 
     * @param {FSDirectory} dir 
     * @param {string[]} args 
     * @returns 
     */
    ls: (stdin, dir, args) => {
        let stdout = ""
        const params = extractAllParams(args)
        
        if (args.length < 1) {
            stdout += dir.ls().map((e) => e.name).join("   ") + "\n"
        }
        else {
            for (let i = args.findIndex((a) => a[0] !== "-"); i < args.length; i++) {
                const tempDir = traversePath(dir, args[i])

                stdout += tempDir.ls().map((e) => e.name).join("   ") + "\n"
            }
        }

        return { stdout: stdout, dir: dir }
    },


}











/**
 * 
 * @param {String} command Command to tokenize
 */
function tokenize(command) {
    const output = []

    let held = ""

    let flags = {
        singleEscape: false,
        doubleEscape: false
    }

    for (let i = 0; i < command.length; i++) {
        // maybe todo: command substitution
        if (command[i] === "#") {
            if (flags.doubleEscape || flags.singleEscape) {
                held += command[i]
            }
            else {
                break
            }
        }
        if (command[i] === "'") {
            if (flags.doubleEscape || command[i-1] === "\\") {
                held += command[i]
            }
            else {
                flags.singleEscape = !flags.singleEscape
            }
        }
        else if (command[i] === "\"") {
            if (flags.singleEscape || command[i-1] === "\\") {
                held += command[i]
            }
            else {
                flags.doubleEscape = !flags.doubleEscape
            }
        }
        else if (command[i] === "|") {
            if (flags.doubleEscape || flags.singleEscape) held += command[i]
            else if (command[i+1] === "|") {
                if (held !== "") output.push(held)
                output.push("||")
                held = ""
                i++
            }
            else {
                if (held !== "") output.push(held)
                output.push("|")
                held = ""
            }
        }
        else if (command[i] === ">") {
            if (flags.doubleEscape || flags.singleEscape) held += command[i]
            else if (command[i+1] === ">") {
                if (held !== "") output.push(held)
                output.push(">>")
                held = ""
                i++
            }
            else {
                if (held !== "") output.push(held)
                output.push(">")
                held = ""
            }
        }
        else if (command[i] === "&") {
            if (flags.doubleEscape || flags.singleEscape) held += command[i]
            else if (command[i+1] === "&") {
                if (held !== "") output.push(held)
                output.push("&&")
                held = ""
                i++
            }
            else {
                throw { code: 2, pos: i, text: "Invalid syntax: \"&\" is not implemented." }
            }
        }
        else if (command[i] === ";") {
            if (flags.doubleEscape || flags.singleEscape) held += command[i]
            else {
                if (held !== "") output.push(held)
                output.push(";")
                held = ""
            }
        }
        else if (command[i] === " " && !flags.singleEscape && !flags.doubleEscape) {
            if (held !== "") output.push(held)
            held = ""

        }
        else {
            held += command[i]
        }
    }

    if (held !== "") output.push(held)

    return output
}

function execute(command) {
    const parsed = tokenize(command)
    console.log(parsed)

    const subcommands = []

    let temp = []
    for (let i = 0; i < parsed.length; i++) {
        if ([">", ">>", "<", "|", ";", "||", "&&"].includes(parsed[i])) {
            subcommands.push(temp, parsed[i])
            temp = []
        }
        else {
            temp.push(parsed[i])
        }
    }
    if (temp.length > 0) subcommands.push(temp)
    
    console.log(subcommands)

    let stdin = ""
    let stdout = ""

    for (let i = 0; i < subcommands.length; i++) {
        const command = subcommands[i]
        switch (command) {
            case "|": {
                stdin = stdout
                break
            }

            case ">": {
                workingDir.write(subcommands[i+1][0], stdout)
                stdout = ""
                i++
                break
            }

            case ">>": {
                workingDir.write(subcommands[i+1][0], (workingDir.children[subcommands[i+1][0]].content ?? "") + stdout)
                stdout = ""
                i++
                break
            }

            case "||": {
                // not implemented
                break
            }
            
            case "&&": {
                // not implemented
                break
            }

            case ";": {
                // doesn't really matter
                break
            }

            default: {
                if (Object.prototype.hasOwnProperty.call(COMMANDS, command[0])) {
                    if (subcommands[i+1] === "<") {
                        if (workingDir.children[subcommands[i+2]]?.type === "FILE") stdin = workingDir.children[subcommands[i+2]].content
                    }
                    console.log(command[0], stdin, command.slice(1))
                    const result = COMMANDS[command[0]](stdin, workingDir, command.slice(1))

                    stdin  = ""
                    stdout = result.stdout
                    console.log(stdout)
                    workingDir = result.dir

                    if (subcommands[i+1] === "<") i += 2

                }
                else {
                    throw { code: 127, pos: i, text: `Unknown command "${command[0]}"` }
                }
            }
        }

    }
}

/**
 * 
 * @param {String} text 
 */
function extractParams(text) {
    if (text.startsWith("--")) {
        return [text.slice(2)]
    }
    else if (text[0] === "-") return text.slice(1).split()
    
    return []
}

/**
 * 
 * @param {string[]} args
 */
function extractAllParams(args) {
    let out = []
    for (let i = 0; args[i]?.[0] === "-"; i++) {
        out = out.concat(extractParams(args[i]))
    }

    return out
}

/**
 * 
 * @param {FSDirectory} dir 
 * @param {string} path 
 */
function traversePath(dir, path) {
    const split = path.split("/")
    split.forEach((v) => {
        if (v === ".") {} // do nothing
        else if (v === "..") dir = dir.parent ?? VFS
        else {
            if (dir.children[v]?.type === "DIR") dir = dir.children[v]
            else { console.error(split, v, dir); throw new Error("Invalid path") }
        }
    })

    return dir
}

input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return
    console.log(execute(input.value))
    input.value = ""
})