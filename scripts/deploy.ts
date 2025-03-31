import { ethers } from "hardhat";

async function main() {
  console.log("Deploying LemonMiner contract...");

  const LemonMiner = await ethers.getContractFactory("LemonMiner");
  const lemonMiner = await LemonMiner.deploy();

  await lemonMiner.waitForDeployment();
  const address = await lemonMiner.getAddress();

  console.log(`LemonMiner deployed to: ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 