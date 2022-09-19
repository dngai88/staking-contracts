// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.12;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract TestErc20 is ERC20PresetMinterPauser {
    constructor() ERC20PresetMinterPauser("TestErc20", "TERC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
