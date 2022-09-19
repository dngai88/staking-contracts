import { HardhatUserConfig } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades"
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.12",
};

export default config;
