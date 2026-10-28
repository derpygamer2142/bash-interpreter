const VERSION = "0.1.0-beta"

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
    /**
     * 
     * @param {FSDirectory} parent 
     * @param {string} name 
     */
    constructor(parent, name) {
        this.parent = parent
        this.name = name
        this.children = {
            ".": this
        }
        if (this.parent) this.children[".."] = this.parent
        this.type = "DIR"

    }

    ls() {
        return Object.keys(this.children)
    }

    rm() {
        if (this.parent) delete this.parent.children[this.name]
        else this.children = {}
    }

    write(file, content) {
        traversePath(this, file, true).content = content
    }
}


/**
 * 
 * @param {FSDirectory} dir 
 * @param {string} path 
 * @param {boolean} create
 * 
 * @returns {FSDirectory | FSFile}
 */
function traversePath(dir, path, create) {
    const split = path.split("/")
    if (split[0] == "") {
        dir = VFS
        split.shift()
    }
    for (let i = 0; i < split.length; i++) {
        const v = split[i]
        if (v === ".") {} // do nothing
        else if (v === "..") dir = dir.parent ?? VFS
        else if (v === "") continue // This is weird, but appears to be standard behavior?
        else {
            if (create && i === split.length-1 && !dir.children[v]) {
                dir.children[v] = new FSFile(dir, v, "")
                dir = dir.children[v]
            }
            else if (dir.children[v]?.type === "DIR" || (i === split.length-1 && dir.children[v]?.type === "FILE")) dir = dir.children[v]
            else { console.error(split, v, dir); throw new Error(`"${path}": No such file or directory\n`) }
        }
    }

    return dir
}

const VFS = new FSDirectory(null, "")
let workingDir = VFS

const temp = new FSDirectory(VFS, "somedir")
temp.write("skibidi.rizz", "only in ohio!!!11!11!\n")
VFS.children["somedir"] = temp

VFS.write("README.txt", "Hello, world!\nThis is some test text, I hope you enjoy it!\n")

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
            return { stdout: stdin, dir: dir, code: 0 }
        }
        else {
            const params = extractAllParams(args)

            // if (params.includes("help")) return { stdout: "Screw you just read the man page https://linux.die.net/man/1/cat", dir: dir, code: 0 }

            if (params.includes("A") || params.includes("show-all")) params.push("v","E","T")
            if (params.includes("e")) params.push("v","E")
            
            
            let start = args.findIndex((a) => a[0] !== "-" || a === "-")
            if (start < 0) {
                args.push("")
                start = args.length-1
            }
            for (let i = start; i < args.length; i++) {
                const v = args[i]
                if (v === "-" || v === "") {
                    let temp = stdin
                    if (params.includes("E") || params.includes("show-ends")) temp = temp.replaceAll("\n", "$\n")
                    if (params.includes("n") || params.includes("number")) {
                        const split = temp.split("\n")
                        temp = ""
                        for (let l = 0; l < split.length; l++) {
                            temp += `${l+1} ${split[l]}\n`
                        }
                    }
                    if (params.includes("s") || params.includes("squeeze-blank")) temp.replaceAll(/\n{3,}/gm, "\n\n") // lazy

                    stdout += `${temp}\n`
                }
                else {
                    let temp;
                    try {
                        temp = traversePath(dir, v)
                    }
                    catch (error) {
                        throw error
                    }

                    temp = temp.content

                    if (params.includes("E") || params.includes("show-ends")) temp = temp.replaceAll("\n", "$\n")
                    if (params.includes("n") || params.includes("number")) {
                        const split = temp.split("\n")
                        temp = ""
                        for (let l = 0; l < split.length; l++) {
                            temp += `${l+1} ${split[l]}\n`
                        }
                    }
                    if (params.includes("s") || params.includes("squeeze-blank")) temp.replaceAll(/\n{3,}/gm, "\n\n") // lazy

                    stdout += temp + "\n"
                }
            }

            return { stdout: stdout, dir: dir, code: 0 }
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
        stdout = args.slice(args.findIndex((a) => a[0] !== "-"))
        
        if (params.includes("e") && !params.includes("E")) stdout = stdout.map((v) => v.replaceAll("\\n", "\n"))

        stdout = stdout.join(" ")
        if (!params.includes("n")) stdout += "\n"

        return { stdout: stdout, dir: dir, code: 0 }
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
        let start = args.findIndex((a) => a[0] !== "-" || a === "-")
        if (start < 0) {
            args.push(".")
            start = args.length-1
        }


        if (args.length < 1) {
            stdout = dir.ls()

            stdout = stdout.join("   ") + "\n"
        }
        else {
            for (let i = start; i < args.length; i++) {
                let tempDir; 
                try {
                    tempDir = traversePath(dir, args[i])
                }
                catch (error) {
                    throw new Error(`cannot access '${args[i]}': No such file or directory`)
                }

                tempDir = tempDir.ls()
                
                if (!params.includes("a") && !params.includes("all")) tempDir = tempDir.filter((v) => v[0] !== ".")
                if (!params.includes("B") && !params.includes("ignore-backups")) tempDir = tempDir.filter((v) => v[0] !== "~")
                // other options omitted because lazy

                stdout += tempDir.join("   ") + "\n"
            }
        }

        return { stdout: stdout, dir: dir, code: 0 }
    },
    info: (stdin, dir, args) => {
        return { stdout:
`This command is unrelated to its POSIX equivalent.
This bash interpreter was originally made for GoldOS in OSWars 26. It has been somewhat modified for usability.
`,
            dir: dir,
            code: 0

        }
    },

    help: (stdin, dir, args) => {
        return { stdout:
`Untitled bash, version ${VERSION} (${"navigator" in globalThis ? "js-web" : "js-headless"})
These shell commands are defined internally.  Type \`help' to see this list.
Type \`help name' to find out more about the function \`name'.
Use \`info bash' to find out more about the shell in general.
Use \`info' to find out more about this shell.
cat [-e] [-A --show-all] [-v --show-nonprinting] [-E --show-ends] [-T --show-tabs] [-n --number] [-s --squeeze-blank] [FILE]
cd [directory]
echo [-neE] [arg ...]
help
info
ls [-a --all] [-B --ignore-backups] [FILE]...
poweroff
touch [-c --no-create] [file]
`,
            dir: dir,
            code: 0
        }
    },

    poweroff: (stdin, dir, args) => {
        return { stdout: "Powering off...", dir: dir, code: 67 }
    },

    cd: (stdin, dir, args) => {
        if (args.length > 1) throw new Error("too many arguments");
        let newdir;
        try {
            newdir = traversePath(dir, args[0] ?? "");
            return { stdout: "", dir: newdir, code: 0 }
        }
        catch (error) {
            throw error
        }
    },

    touch: (stdin, dir, args) => {
        const params = extractAllParams(args)
        let start = args.findIndex((a) => a[0] !== "-" || a === "-")
        if (args.length < 1) {
            throw new Error("missing file operand")
        }
        

        for (let i = start; i < args.length; i++) {
            traversePath(dir, args[i], !(params.includes("c") || params.includes("no-create")))
        }

        return { stdout: "", dir, code: 0 }
    }
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
                throw new Error("Invalid syntax: \"&\" is not implemented.\n")
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

function textWrapStdout(stdout) {

    /** @type {string[]} */
    const split = stdout.split("\n")
    for (let i = 0; i < split.length; i++) {
        const temp = []
        for (let j = 0; j < split[i].length; j += 75) {
            temp.push(split[i].slice(j, j+75))
        }
        split.splice(i, 1, ...temp)
        i += temp.length-1
    }

    if (split.length == 0) return ""
    stdout = split.slice(0, split.length-1).join("\n") + "\n" + split[split.length-1] + (stdout[stdout.length-1] === "\n" ? "\n" : "")

    return stdout
}

function execute(command) {
    let stdin = ""
    let stdout = ""
    let sentStdout = ""
    let exitCode = 0

    try {
        const parsed = tokenize(command)
        // console.log(parsed)

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
        
        // console.log(subcommands)



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
                    workingDir.write(subcommands[i+1][0], (traversePath(workingDir, subcommands[i+1][0], true).content ?? "") + stdout)
                    stdout = ""
                    i++
                    break
                }

                case "||": {
                    if (exitCode === 0) i++ // second command only executed if the previous failed
                    break
                }
                
                case "&&": {
                    if (exitCode !== 0) i++ // second command only executed if the previous was successful
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
                        //console.log(command[0], stdin, command.slice(1))

                        try {
                            const result = COMMANDS[command[0]](stdin, workingDir, command.slice(1))

                            stdin  = ""
                            if ([">", ">>", "|"].includes(subcommands[i+1])) {
                                // stdout is redirected, do not flush to terminal
                                stdout = result.stdout
                            }
                            else {
                                sentStdout += result.stdout
                            }
                            //console.log(stdout)
                            workingDir = result.dir

                            exitCode = result.code
                            if (exitCode === 67) return { stdout: textWrapStdout(sentStdout), code: exitCode }

                            if (subcommands[i+1] === "<") i += 2 // already handled
                        }
                        catch (error) {
                           sentStdout = `${sentStdout}\n${command[0]}: ${error.message ?? "Unknown error"}`
                           exitCode = 1
                        }

                    }
                    else {
                        exitCode = 1
                        sentStdout = `${sentStdout}\nUnknown command "${command[0]}"\n`
                    }
                }
            }

        }

        return { stdout: textWrapStdout(sentStdout), code: exitCode }
    }
    catch (err) { // couldn't escape from the error; just exit
        return { stdout: textWrapStdout(sentStdout + "\nERROR: " + err?.message ?? "(UNKNOWN)"), code: 1 }
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
    else if (text[0] === "-") return text.slice(1).split("")
    
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


export { execute, VFS as VirtualFileSystem, workingDir as cwd, FSFile, FSDirectory };