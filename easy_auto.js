#!/usr/bin/env node

import fs from "node:fs"
import child_process from "node:child_process"
import path from "node:path"
import readline from "node:readline/promises"
import stream from "node:stream"

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

const config = fs.existsSync('config.json') ? JSON.parse(fs.readFileSync('config.json')) : {}
function saveConfig() { fs.writeFileSync('config.json', JSON.stringify(config, null, 2), 'utf-8') }

if (!("jdk17" in config)) {
  config.jdk17 = "C:/Program Files/Java/jdk-17/bin"
  config.geyser = false
  config.floodgate = false
  config.geyserLength = 0
  config.floodgateLength = 0
  config.windows_playit = "to use playit insert path here"
  config.compilePaper = false
  saveConfig()
  console.log("Wrote default config to config.json")
  console.log('Default JDK17 installation path for Linux: "/usr/lib/jvm/java-17-openjdk-amd64/bin"')
  console.log("Run again after editing the config")
  process.exit(1)
}

if (config.compilePaper) {
  console.log("JDK17 install location: ", path.join(config.jdk17, `java${process.platform === "win32" ? ".exe" : ""}`))
  if (!fs.existsSync(path.join(config.jdk17, "java.exe")) && !fs.existsSync(path.join(config.jdk17, "java"))) {
    console.log("JDK17 is not installed or the path in config.json is incorrect")
    console.log('Default JDK17 installation path for Linux: "/usr/lib/jvm/java-17-openjdk-amd64/bin"')
    process.exit(1)
  }
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
if (config.compilePaper) {
  if (!fs.existsSync("paper_repo")) {
    await spawn('git', ['clone', 'https://github.com/PaperMC/Paper.git', 'paper_repo']).promise
  }
}

if (config.compilePaper) {
  await gitPull("paper_repo")
}

// Compiles PaperMC Or Downloads PaperMC
if (config.compilePaper) {
  if (commits[0].sha !== config.last) {
    console.log("outdated")
    config.last = commits[0].sha
    saveConfig()
    console.log("Starting to compile paper, do not close. This will take a while.")
    console.log("Applying Patches")
    //await spawn(`${process.platform === "win32" ? "gradlew.bat" : "./gradlew"}`, ['applyPatches'], { cwd:"paper_repo" }).promise
    await spawn(process.platform === "win32" ? "gradlew.bat" : "./gradlew", ['applyPatches'], { cwd:"paper_repo", stdio:"inherit" }).promise
    console.log("Creating Jar")
    //await spawn(`${process.platform === "win32" ? "gradlew.bat" : "./gradlew"}`, ['createReobfBundlerJar'], { cwd:"paper_repo" }).promise
    await spawn(process.platform === "win32" ? "gradlew.bat" : "./gradlew", ['createReobfBundlerJar'], { cwd:"paper_repo", stdio:"inherit" }).promise
    await fs.promises.mkdir("server-files", { recursive: true })
    await fs.promises.rename(path.join("paper_repo/build/libs", fs.readdirSync("paper_repo/build/libs")[0]), "server-files/server.jar")
    console.log("Finished compiling paper")
  } else {
    console.log("paper is up to date")
  }
}else {
  await fs.promises.mkdir("server-files", { recursive: true })
  const api = "https://api.papermc.io/v2"
  const {versions} = await fetch(`${api}/projects/paper`).then(e => e.json())
  for (let i = versions.length-1; i >= 0; i--) {
    const {builds} = await fetch(`${api}/projects/paper/versions/${versions[i]}/builds`).then(e => e.json())
    const build = builds.findLast(e => e.channel === "default")
    if (!build) { continue }
    if (build.build <= (config.lastPaperBuild ?? 0)) { break }
    console.log("downloading paper")
    const res = await fetch(`${api}/projects/paper/versions/${versions[i]}/builds/${build.build}/downloads/${build.downloads.application.name}`)
    const out = fs.createWriteStream("server-files/server.jar")
    await stream.promises.finished(stream.Readable.fromWeb(res.body).pipe(out))
    config.lastPaperBuild = build.build
    saveConfig()
    break
  }
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

await new Promise(fulfil => setTimeout(fulfil, 100))
//console.log("Finished")
process.exit(0)