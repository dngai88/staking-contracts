import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, upgrades } from 'hardhat';
import { BigNumber } from 'ethers';
import { expect } from 'chai';
import { expandTo18Decimals, withinRange, expandToDecimals, getCurrentTime, getDurationInSecondsFromDays, mine } from './utils';
import { EverM, StakingContractUpgradeable, TestErc20 } from '../typechain-types';

context(`StakingContractUpgradeable`, async () => {
  let stakingContract: StakingContractUpgradeable;
  let weth: TestErc20;
  let everM: EverM;
  let admin: SignerWithAddress, account1: SignerWithAddress, account2: SignerWithAddress, account3: SignerWithAddress;
  beforeEach(async () => {
    [admin, account1, account2, account3] = await ethers.getSigners();

    const WETHContract = await ethers.getContractFactory("TestErc20");
    weth = await WETHContract.deploy();
    await weth.deployed();

    const EverMContract = await ethers.getContractFactory("EverM");
    everM = await EverMContract.deploy(expandTo18Decimals(1000000000), admin.address);
    await everM.deployed();

    const StakingContractUpgradeable = await ethers.getContractFactory("StakingContractUpgradeable");
    stakingContract = await upgrades.deployProxy(StakingContractUpgradeable, [everM.address, weth.address]) as StakingContractUpgradeable;
    await stakingContract.deployed();
  })

  it(`Deploy success`, async () => {
    expect(stakingContract.address).to.be.properAddress;
  })

  async function approve(account: SignerWithAddress) {
    await everM.connect(admin).transfer(account.address, expandTo18Decimals(1000000));
    await everM.connect(account).approve(stakingContract.address, expandTo18Decimals(1000000));
  }

  context(`Start new phase`, async () => {
    let phaseDuration: number;
    let stakeAmountAccount1: BigNumber, stakeAmountAccount2: BigNumber;

    beforeEach(async () => {
      phaseDuration = 864000;
      stakeAmountAccount1 = expandTo18Decimals(1000);
      await approve(account1);
    })

    it(`Only admin can start new phase`, async () => {
      await expect(stakingContract.connect(account1).startPhase(phaseDuration))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it(`Total stake correct before start a phase`, async () => {
        const userBalance = await everM.balanceOf(account1.address);
        console.log(`userBalance ${userBalance}`);
        await expect(stakingContract.connect(account1).stake(stakeAmountAccount1))
            .to.be.emit(stakingContract, "UserStaked")
            .withArgs(account1.address, stakeAmountAccount1);

        const userStake = await stakingContract.userStake(account1.address);
        const totalStake = await stakingContract.totalStake();
        expect(userStake).to.be.equal(stakeAmountAccount1);
        expect(totalStake).to.be.equal(stakeAmountAccount1);
    });

    it(`Balance change success when stake`, async () => {
        await expect(stakingContract.connect(account1).stake(stakeAmountAccount1))
            .to.changeTokenBalances(
                everM,
                [stakingContract, account1],
                [stakeAmountAccount1, stakeAmountAccount1.mul(-1)],
            );
    })
  })
})
