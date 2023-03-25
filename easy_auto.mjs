import fs from "node:fs"
import child_process from "node:child_process"
import path from "node:path"
import readline from "node:readline/promises"

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const config = fs.existsSync('config.json') ? JSON.parse(fs.readFileSync('config.json')) : {}
function saveConfig() { fs.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf-8') }

if (!("jdk17" in config)) {
  config.jdk17 = "C:/Program Files/Java/jdk-17/bin"
  config.server_launch_options = "-Xmx1024M -Xms1024M -jar server.jar nogui"
  config.geyser = false
  config.floodgate = false
  config.geyserLength = 0
  config.floodgateLength = 0
  config.windows_playit = "to use playit insert path here"
  saveConfig()
  console.log("wrote default config to config.json (IT MAY NEED TO BE CHANGED)")
  process.exit(0)
}
console.log("JDK17 install location: ", path.join(config.jdk17, "java.exe"))
if (!fs.existsSync(path.join(config.jdk17, "java.exe")) && !fs.existsSync(path.join(config.jdk17, "java"))) {
  console.log("JDK17 is not installed or the path in config.json is incorrect")
  while (true) {}
}

// Spawns a child process
globalThis.spawn = function(exe, args, options = { stdio: 'ignore' }) {
  const proc = child_process.spawn(exe, args, options)
  proc.promise = new Promise((fulfil, reject) => {
    proc.on('close', fulfil)
    proc.on('error', reject)
    proc.on('exit', code => {
      if (code === 1) {
        reject('An error occurred.')
      }
    })
  })
  return proc
}

// Pulls from github
globalThis.gitPull = async function(cwd) {
  await spawn('git', ['pull'], {stdio: 'ignore', cwd}).promise
}

// Check for Updates/Update Plugins
async function updatePlugin(url, prop, fileName, pluginName) {
  const len = (await fetch(url, {method: "HEAD"})).headers.get("Content-Length")
  if (config[prop] !== len) {
    await fs.promises.mkdir("server-files/plugins/Geyser-Spigot", { recursive: true })
    console.log("installing", pluginName)
    fs.writeFileSync(fileName, new Uint8Array(await (await fetch(url).then(e => e.blob())).arrayBuffer()))
    console.log("finisished installing", pluginName)
    config[prop] = len
    saveConfig()
  }
}

// Check if paper updated
const commits = await fetch("https://api.github.com/repos/papermc/paper/commits").then(e => e.json())

// Clones and Fetchs PaperMC
if (!fs.existsSync("paper_repo")) {
  await spawn('git', ['clone', 'https://github.com/PaperMC/Paper.git', 'paper_repo']).promise
}

await gitPull("paper_repo")

// Compiles PaperMC
if (commits[0].sha !== config.last) {
  console.log("outdated")
  config.last = commits[0].sha
  saveConfig()
  console.log("starting to compile")
  await spawn(`gradlew${process.platform === "win32" ? ".bat" : ""}`, ['applyPatches'], { cwd:"paper_repo" }).promise
  await spawn(`gradlew${process.platform === "win32" ? ".bat" : ""}`, ['createReobfBundlerJar'], { cwd:"paper_repo" }).promise
  await fs.promises.mkdir("server-files", { recursive: true })
  await fs.promises.rename(path.join("paper_repo/build/libs", fs.readdirSync("paper_repo/build/libs")[0]), "server-files/server.jar")
} else {
  console.log("paper is up to date")
}

// Update/Install Geyser
if (config.geyser) { await updatePlugin("https://ci.opencollab.dev/job/GeyserMC/job/Geyser/job/master/lastSuccessfulBuild/artifact/bootstrap/spigot/build/libs/Geyser-Spigot.jar", "geyserLength", "server-files/plugins/Geyser-Spigot.jar", "geyser") }
if (config.floodgate) {
  await updatePlugin("https://ci.opencollab.dev/job/GeyserMC/job/Floodgate/job/master/lastSuccessfulBuild/artifact/spigot/build/libs/floodgate-spigot.jar", "floodgateLength", "server-files/plugins/floodgate-spigot.jar", "floodgate")
  if (!fs.existsSync("server-files/plugins/Geyser-Spigot/config.yml")) {
    await fs.promises.mkdir("server-files/plugins/Geyser-Spigot", { recursive: true })
    fs.promises.copyFile("geyser-config.yml", "server-files/plugins/Geyser-Spigot/config.yml")
  }
}

//Agree to the server EULA
if (!fs.existsSync("server-files/eula.txt")) {
  if (await rl.question("enter (y) to agree to the Minecraft EULA (https://aka.ms/MinecraftEULA) (leave blank to skip) ") === "y") {
    fs.writeFileSync("server-files/eula.txt", "eula=true", "utf-8")
    console.log("agreed")
  } else {
    console.log("left blank")
  }
}

// Starts playit if installed
if (fs.existsSync(config.windows_playit)) { child_process.exec(`start cmd /k "${path.resolve(config.windows_playit)}"`) }

// Starts the minecraft server
console.log("starting minecraft server")
child_process.exec(`start cmd.exe /k "${config.jdk17}/java${process.platform === "win32" ? ".exe" : ""}" ${config.server_launch_options}`, {cwd: "./server-files"})

await new Promise(fulfil => setTimeout(fulfil, 100))
console.log("Finished")
process.exit(0)