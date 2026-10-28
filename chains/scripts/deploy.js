const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const NAME = "blockapp";      // the contract name inside contracts/*.sol
const OUT = "blockapp.json";  // the file the website reads (web/src/contracts/)

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const Factory = await hre.ethers.getContractFactory(NAME);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const receipt = await contract.deploymentTransaction().wait();
  const { chainId } = await hre.ethers.provider.getNetwork();
  const artifact = await hre.artifacts.readArtifact(NAME);

  const dir = path.join(__dirname, "..", "..", "web", "src", "contracts");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, OUT),
    JSON.stringify({ address, chainId: Number(chainId), block: receipt.blockNumber, abi: artifact.abi }, null, 2)
  );

  console.log(`${NAME} deployed to:`, address);
  console.log("Admin (deployer):   ", deployer.address);
  console.log("Website file:       ", `web/src/contracts/${OUT}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });