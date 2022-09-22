# Overview

This project includes smart contracts about staking in Evermon. 
 
# StakingContractUpgradeable
This is an upgradeable smart contract. It allows users to stake an ERC20 token to receive ERC20 token, such as stake EverM and receive WETH.
Rewards is distributed in multiple phases, each phase is independent, and phase `x` must be start after phase `x - 1` ended. 
Each phase is started by owner, by using method `startPhase`, and owner can free to choose duration of each phase at the time phase start. 
Owner then pass reward of each phase, using method `fundPhase`.
User can stake anytime using `stake` method, and can unstake anytime using `unstake` method. User can claim reward using `claimReward` method, and only claim reward of a phase after phase ended and phase is funded. 

Reward of each user is calculated, using the amount token user stake, and the time each token is staked. We have a new term, called contribution, to estimate how much user contribute to contract in each phase, and it's is calculated by the amount of token times the amount of time each token staked. For example:

    - Account1 stake 100 EverM (100 * 10**18 wei), in 2 days (172800 seconds) => user1Contribution = 100 * 10**18 * 172800 = 172800 * 10 ** 20  
    - Account2 stake 50 EverM (50 * 10**18 wei), in 1 days (86400 seconds) => user2Contribution = 50 * 10 ** 18 * 86400 = 216000 * 10 ** 19
    - totalContribution = user1Contribution + user2Contribution
    - Provide reward of the phase is 100 WETH => reward of account1 is: 100WETH * user1Contribution / totalContribution.


# CLI
Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```
