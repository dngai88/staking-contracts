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

  context(`Start new phase`, async () => {
    it(`Only admin can start new phase`, async () => {
      await expect(stakingContract.connect(account1).startPhase(1))
        .to.be.revertedWith("Ownable: caller is not the owner");
    })
  })
})
