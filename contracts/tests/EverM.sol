// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetFixedSupply.sol";

contract EverM is ERC20PresetFixedSupply {
    constructor(uint256 initialSupply, address owner)
    ERC20PresetFixedSupply("EverM", "EVM", initialSupply, owner) {}
}
