const hre = require("hardhat");

async function main() {
  console.log("Deploying ExamRegistry contract to Sepolia...");

  const ExamRegistry = await hre.ethers.getContractFactory("ExamRegistry");
  const examRegistry = await ExamRegistry.deploy();

  await examRegistry.waitForDeployment();

  const address = await examRegistry.getAddress();
  console.log(`ExamRegistry deployed to: ${address}`);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await examRegistry.deploymentTransaction().wait(5);
  
  console.log("Deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Verify contract on Etherscan:");
  console.log(`   npx hardhat verify --network sepolia ${address}`);
  console.log("\n2. Update frontend with contract address");
  console.log("\n3. Test contract functions");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


