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

  xcontext(`Start new phase`, async () => {
    let phaseDuration: number;
    let stakeAmountAccount1: BigNumber, stakeAmountAccount2: BigNumber;

    beforeEach(async () => {
      phaseDuration = 864000;
      stakeAmountAccount1 = expandTo18Decimals(1000);
      stakeAmountAccount2 = expandTo18Decimals(4000);
      await approve(account1);
      await approve(account2);
    })

    it(`Only admin can start new phase`, async () => {
      await expect(stakingContract.connect(account1).startPhase(phaseDuration))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it(`Total stake correct before start a phase`, async () => {
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

    it(`Start a phase success`, async () => {
        await expect(stakingContract.connect(admin).startPhase(phaseDuration))
            .to.be.emit(stakingContract, "PhaseStarted")
            .withArgs(1, phaseDuration);
    })

    it(`Start new phase, contribution success`, async () => {
        await stakingContract.connect(account1).stake(stakeAmountAccount1);
        await stakingContract.connect(admin).startPhase(phaseDuration);
        const { userContribution, totalContribution } = await stakingContract.userContributionInPhase(account1.address, 0);
        expect(userContribution).to.be.equal(stakeAmountAccount1.mul(phaseDuration));
        expect(totalContribution).to.be.equal(stakeAmountAccount1.mul(phaseDuration));
    })

    it(`Contribution correct`, async () => {
        await stakingContract.connect(account1).stake(stakeAmountAccount1);
        await stakingContract.connect(admin).startPhase(phaseDuration);
        await mine(phaseDuration / 2 - 1);
        await stakingContract.connect(account2).stake(stakeAmountAccount2);
        await mine(phaseDuration / 2);
        const { userContribution: user1Contribution, totalContribution: total1Contribution } = await stakingContract.userContributionInPhase(account1.address, 0);
        const { userContribution: user2Contribution, totalContribution: total2Contribution } = await stakingContract.userContributionInPhase(account2.address, 0);
        expect(total1Contribution).to.be.equal(total2Contribution);
        expect(withinRange(total1Contribution, stakeAmountAccount1.mul(phaseDuration).add(stakeAmountAccount2.mul(phaseDuration / 2))));
        expect(user1Contribution).to.be.equal(stakeAmountAccount1.mul(phaseDuration));
        expect(withinRange(user2Contribution, stakeAmountAccount2.mul(phaseDuration / 2)));
    })
  })

  xcontext(`Contribution correctly after multiple phases`, async () => {
    let phase1Duration: number, phase2Duration: number, phase3Duration: number;
    let stakeAmount1Account1: BigNumber, stakeAmount2Account1: BigNumber, stakeAmount3Account1: BigNumber, stakeAmountAccount2: BigNumber;

    beforeEach(async () => {
        phase1Duration = 864000;
        phase2Duration = 1728000;
        phase3Duration = 7776000;
        stakeAmount1Account1 = expandTo18Decimals(1000);
        stakeAmount2Account1 = expandTo18Decimals(2000);
        stakeAmount3Account1 = expandTo18Decimals(4000);
        stakeAmountAccount2 = expandTo18Decimals(4000);
        await approve(account1);
        await approve(account2);
        await stakingContract.connect(account1).stake(stakeAmount1Account1);
        await stakingContract.connect(admin).startPhase(phase1Duration);
        await mine(phase1Duration);
    })

    it(`Contribution correct after multiple phase passed`, async () => {
        await stakingContract.connect(admin).startPhase(phase2Duration);
        await mine(phase2Duration);
        const { userContribution: userContribution1, totalContribution: totalContribution1 } = await stakingContract.userContributionInPhase(account1.address, 0);
        const { userContribution: userContribution2, totalContribution: totalContribution2 } = await stakingContract.userContributionInPhase(account1.address, 1);
        expect(userContribution1).to.be.equal(stakeAmount1Account1.mul(phase1Duration));
        expect(userContribution2).to.be.equal(stakeAmount1Account1.mul(phase2Duration));
    })

    it(`Contribution correct after staking after phase 1, before phase 2`, async () => {
        await stakingContract.connect(account1).stake(stakeAmount2Account1);
        await stakingContract.connect(admin).startPhase(phase2Duration);
        const { userContribution: userContribution1, totalContribution: totalContribution1 } = await stakingContract.userContributionInPhase(account1.address, 0);
        const { userContribution: userContribution2, totalContribution: totalContribution2 } = await stakingContract.userContributionInPhase(account1.address, 1);
        expect(userContribution1).to.be.equal(stakeAmount1Account1.mul(phase1Duration), "Phase 1 incorrect");
        expect(userContribution2).to.be.equal((stakeAmount1Account1.add(stakeAmount2Account1)).mul(phase2Duration), "Phase 2 incorrect");
        expect(totalContribution2).to.be.equal(stakeAmount1Account1.add(stakeAmount2Account1).mul(phase2Duration));
    })

    it(`Contribution correct in phase 3`, async () => {
        await stakingContract.connect(admin).startPhase(phase2Duration);
        await mine(phase2Duration);
        await stakingContract.connect(admin).startPhase(phase3Duration);
        await mine(phase3Duration / 4 - 1);
        await stakingContract.connect(account1).stake(stakeAmount3Account1);

        const { userContribution: userContribution1, totalContribution: totalContribution1 } = await stakingContract.userContributionInPhase(account1.address, 0);
        const { userContribution: userContribution2, totalContribution: totalContribution2 } = await stakingContract.userContributionInPhase(account1.address, 1);
        const { userContribution: userContribution3, totalContribution: totalContribution3 } = await stakingContract.userContributionInPhase(account1.address, 2);

        expect(userContribution1).to.be.equal(stakeAmount1Account1.mul(phase1Duration), "UserContribution phase 1");
        expect(totalContribution1).to.be.equal(stakeAmount1Account1.mul(phase1Duration), "TotalContribution phase 1");
        expect(userContribution2).to.be.equal(stakeAmount1Account1.mul(phase2Duration)), "UserContribution phase 2";
        expect(totalContribution2).to.be.equal(stakeAmount1Account1.mul(phase2Duration), "TotalContribution phase 2");
        expect(userContribution3).to.be.equal((stakeAmount1Account1.mul(phase3Duration))
                                            .add(stakeAmount3Account1.mul(phase3Duration).mul(3).div(4)), "UserContribution phase 3");
        expect(totalContribution3).to.be.equal(userContribution3);
    })
  })

  xcontext(`Two user stake`, async () => {
    let phase1Duration: number, phase2Duration: number, phase3Duration: number;
    let stakeAmount1Account1: BigNumber, stakeAmount2Account1: BigNumber, stakeAmount3Account1: BigNumber, stakeAmount1Account2: BigNumber;

    beforeEach(async () => {
        phase1Duration = 864000;
        phase2Duration = 1728000;
        phase3Duration = 7776000;
        stakeAmount1Account1 = expandTo18Decimals(1000);
        stakeAmount2Account1 = expandTo18Decimals(2000);
        stakeAmount3Account1 = expandTo18Decimals(4000);
        stakeAmount1Account2 = expandTo18Decimals(4000);
        await approve(account1);
        await approve(account2);
        await stakingContract.connect(account1).stake(stakeAmount1Account1);
        await stakingContract.connect(admin).startPhase(phase1Duration);
        await mine(phase1Duration);
    })

    it(`Contribution correct when another account stake`, async () => {
        await stakingContract.connect(account2).stake(stakeAmount1Account2);
        await stakingContract.connect(admin).startPhase(phase2Duration);

        const { userContribution: user1Contribution1, totalContribution: total1Contribution1 } = await stakingContract.userContributionInPhase(account1.address, 0);
        const { userContribution: user1Contribution2, totalContribution: total1Contribution2 } = await stakingContract.userContributionInPhase(account1.address, 1);
        const { userContribution: user2Contribution1, totalContribution: total2Contribution1 } = await stakingContract.userContributionInPhase(account2.address, 0);
        const { userContribution: user2Contribution2, totalContribution: total2Contribution2 } = await stakingContract.userContributionInPhase(account2.address, 1);
        expect(user1Contribution2).to.be.equal(stakeAmount1Account1.mul(phase2Duration));
        expect(user2Contribution1).to.be.equal(0);
        expect(user2Contribution2).to.be.equal(stakeAmount1Account2.mul(phase2Duration));
        expect(total1Contribution2).to.be.equal(total2Contribution2);
        expect(total2Contribution2).to.be.equal(
            stakeAmount1Account1.mul(phase2Duration)
            .add(stakeAmount1Account2.mul(phase2Duration))
        );
    })
  })

  context(`User unstake`, async () => {
    let phase1Duration: number, phase2Duration: number, phase3Duration: number;
    let stakeAmount1Account1: BigNumber, stakeAmount2Account1: BigNumber, stakeAmount3Account1: BigNumber, stakeAmount1Account2: BigNumber;

    beforeEach(async () => {
        phase1Duration = 864000;
        phase2Duration = 1728000;
        phase3Duration = 7776000;
        stakeAmount1Account1 = expandTo18Decimals(1000);
        stakeAmount2Account1 = expandTo18Decimals(2000);
        stakeAmount3Account1 = expandTo18Decimals(4000);
        stakeAmount1Account2 = expandTo18Decimals(4000);
        await approve(account1);
        await approve(account2);
        await stakingContract.connect(account1).stake(stakeAmount1Account1);
        await stakingContract.connect(admin).startPhase(phase1Duration);
        await mine(phase1Duration);
    })

    it(`User stake emit event`, async () => {
        await expect(stakingContract.connect(account1).unstake(stakeAmount1Account1))
            .to.be.emit(stakingContract, "UserUnstaked")
            .withArgs(account1.address, stakeAmount1Account1);
    })

    it(`User unstake success`, async () => {
        const stakeAmountUnstake = stakeAmount1Account1.div(4);
        const remainStake = stakeAmount1Account1.sub(stakeAmountUnstake);
        await expect(() => stakingContract.connect(account1).unstake(stakeAmountUnstake))
            .to.changeTokenBalances(
                everM,
                [stakingContract, account1],
                [stakeAmountUnstake.mul(-1), stakeAmountUnstake],
            );
        const userStake = await stakingContract.userStake(account1.address);
        const totalStake = await stakingContract.totalStake();
        expect(userStake).to.be.equal(totalStake);
        expect(userStake).to.be.equal(remainStake);
    })

    context(`Contribution correct after unstaking`, async () => {
        beforeEach(async () => {
            await stakingContract.connect(admin).startPhase(phase2Duration);
            await mine(phase2Duration);

            await stakingContract.connect(admin).startPhase(phase3Duration);
        })
        
        it(`Correct contribution if dont unstake`, async () => {
            const { userContribution, totalContribution } = await stakingContract.userContributionInPhase(account1.address, 2);
            expect(userContribution).to.be.equal(stakeAmount1Account1.mul(phase3Duration));
        });

        it(`Correct contribution if user stake`, async () => {
            const unstakeAmount = stakeAmount1Account1.div(4).mul(3);
            const remainStake = stakeAmount1Account1.sub(unstakeAmount);
            await mine(phase3Duration / 4 - 1);
            await stakingContract.connect(account1).unstake(unstakeAmount);
            const { userContribution, totalContribution } = await stakingContract.userContributionInPhase(account1.address, 2);
            expect(userContribution).to.be.equal(
                stakeAmount1Account1.mul(phase3Duration / 4)
                .add(remainStake.mul(phase3Duration).mul(3).div(4))
            )
        })
    })
  })
})
