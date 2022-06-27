// #!/usr/bin/env zx
/**
 * build modpack
 */
import path from "path";
import fse from "fs-extra";
import toml from "toml";
import chalk from "chalk";
import AdmZip from "adm-zip";
import glob from "glob";
const { version } = fse.readJSONSync("package.json");

// fix for windows $''
$.quote = (s) => s;

// build modpacks
await $`packwiz refresh`;
console.log(chalk.blue("building modrinth modpack..."));
await $`packwiz modrinth export`;
console.log(chalk.blue("building curseforge modpack..."));
await $`packwiz curseforge export`;

fse.ensureDirSync("dist");
fse.emptyDirSync("dist");

// extract mod files
console.log(chalk.blue("extracting mod files..."));
const mrpack = new AdmZip(`DSRVMC Vanilla Modpack-${version}.mrpack`);
mrpack.getEntries().forEach((entry) => {
  if (entry.entryName.endsWith(".jar")) {
    console.log(chalk.blue(`extracting ${path.basename(entry.entryName)}...`));
    mrpack.extractEntryTo(entry.entryName, "dist/mods", false, true);
  }
});
const cfpack = new AdmZip(`DSRVMC Vanilla Modpack-${version}.zip`);
cfpack.getEntries().forEach((entry) => {
  if (entry.entryName.endsWith(".jar")) {
    console.log(chalk.blue(`extracting ${path.basename(entry.entryName)}...`));
    cfpack.extractEntryTo(entry.entryName, "dist/mods", false, true);
  }
});

// copy overrides
console.log(chalk.blue("processing overrides..."));
fse.copySync("overrides", "dist", { overwrite: true });

// generate json & markdown
let markdown = "\n";
const json = {
  time: Date.now(),
  release: "",
  version: "",
  mods: [],
  modrinth: "//modrinth.com/modpack/dsrvmc",
  java: "//pan.baidu.com/s/11a6jx0MNM8BfrgDum1Ku_w?pwd=cksq",
  package: "//pan.baidu.com/s/1HwO9hWnQtIFzegXS5WOFyA?pwd=4ii1",
};
const pack = toml.parse(fse.readFileSync("pack.toml", "utf-8"));
json.release = pack.version;
json.version = pack.versions.minecraft;
const mods = glob.sync("mods/*.pw.toml");
mods.forEach((mod) => {
  const tomlFile = fse.readFileSync(mod, "utf-8");
  const basename = path.basename(mod, ".pw.toml");
  const modinfo = toml.parse(tomlFile);
  const modName = modinfo.name;
  let modSource = -1;
  let modLink = "";
  if (modinfo.update.modrinth) {
    modSource = 0;
    modLink = `//modrinth.com/mod/${basename}`;
  } else if (modinfo.update.curseforge) {
    modSource = 1;
    modLink = `//www.curseforge.com/minecraft/mc-mods/${basename}`;
  }
  markdown += `- ${modName}: https:${modLink}\n`;
  json.mods.push({
    name: modName,
    source: modSource,
    link: modLink,
  });
});
fse.writeJSONSync("index.json", json);
let mdfile = fse.readFileSync("README.md", "utf-8");
mdfile = mdfile.replace(
  /### Mods[^]*### Shaders/,
  `### Mods\n${markdown}\n### Shaders`
);
fse.writeFileSync("README.md", mdfile);

console.log(chalk.green(`done for version ${version}`));
